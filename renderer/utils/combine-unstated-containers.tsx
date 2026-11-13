import React, {FunctionComponent, type PropsWithChildren} from 'react';
import type {Container} from 'unstated-next';

type ContainerOrWithInitialState<T = any> = Container<any, T> | [Container<any, T>, T];

const combineUnstatedContainers = (containers: ContainerOrWithInitialState[]) => ({children}: PropsWithChildren<Record<string, unknown>>) =>
  // eslint-disable-next-line unicorn/no-array-reduce
  containers.reduce<React.ReactElement>(
    (tree, ContainerOrWithInitialState) => {
      if (Array.isArray(ContainerOrWithInitialState)) {
        const [Container, initialState] = ContainerOrWithInitialState;
        return <Container.Provider initialState={initialState}>{tree}</Container.Provider>;
      }

      return <ContainerOrWithInitialState.Provider>{tree}</ContainerOrWithInitialState.Provider>;
    },
    // @ts-expect-error -- children is a ReactNode, and reduce() wants a ReactElement to start from
    children,
  );
export default combineUnstatedContainers;
