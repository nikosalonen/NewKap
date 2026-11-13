import {Subscribe} from 'unstated';

export const connect = (containers, mapStateToProps, mapActionsToProps) => Component => props => (
  <Subscribe to={containers}>
    {
      (...instances) => {
        const stateProps = mapStateToProps ? mapStateToProps(...instances.map(a => a.state)) : {};
        const actionProps = mapActionsToProps ? mapActionsToProps(...instances) : {};
        const componentProps = {...props, ...stateProps, ...actionProps};

        return <Component {...componentProps}/>;
      }
    }
  </Subscribe>
);

export {default as CursorContainer} from './cursor';
export {default as CropperContainer} from './cropper';
export {default as ActionBarContainer} from './action-bar';
export {default as PreferencesContainer} from './preferences';
export {default as ConfigContainer} from './config';
