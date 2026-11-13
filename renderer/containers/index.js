import {
  createContext,
  use,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

// Maps each container class to the instance a page provides.
const ContainerContext = createContext(new Map());

export const Provider = ({inject, children}) => {
  const parentContainers = use(ContainerContext);

  // Pages keep `inject` in a module-level array, so this map stays the same
  // between renders and connected components don't render again for nothing.
  const containers = useMemo(() => {
    const map = new Map(parentContainers);

    for (const instance of inject) {
      map.set(instance.constructor, instance);
    }

    return map;
  }, [parentContainers, inject]);

  return (
    <ContainerContext value={containers}>
      {children}
    </ContainerContext>
  );
};

const useContainers = containerClasses => {
  const containers = use(ContainerContext);
  const [, rerender] = useReducer(count => count + 1, 0);

  const instances = containerClasses.map(ContainerClass => {
    const instance = containers.get(ContainerClass);

    if (!instance) {
      throw new Error(`No ${ContainerClass.name} provided. Add it to the page's <Provider inject={[…]}>.`);
    }

    return instance;
  });

  const renderedStates = instances.map(instance => instance.state);

  useEffect(() => {
    const unsubscribes = instances.map(instance => instance.subscribe(rerender));

    // A container can change after this render and before the effect subscribes.
    if (instances.some((instance, index) => instance.state !== renderedStates[index])) {
      rerender();
    }

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  });

  return instances;
};

export const connect = (containerClasses, mapStateToProps, mapActionsToProps) => Component => {
  const Connected = props => {
    const instances = useContainers(containerClasses);
    const stateProps = mapStateToProps ? mapStateToProps(...instances.map(instance => instance.state)) : {};
    const actionProps = mapActionsToProps ? mapActionsToProps(...instances) : {};

    return <Component {...props} {...stateProps} {...actionProps}/>;
  };

  Connected.displayName = `Connected(${Component.displayName ?? Component.name})`;

  return Connected;
};

export {default as CursorContainer} from './cursor';
export {default as CropperContainer} from './cropper';
export {default as ActionBarContainer} from './action-bar';
export {default as PreferencesContainer} from './preferences';
export {default as ConfigContainer} from './config';
