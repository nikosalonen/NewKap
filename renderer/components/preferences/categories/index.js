import React from 'react';
import PropTypes from 'prop-types';
import {connect, PreferencesContainer} from '../../../containers';
import General from './general';
import Keybinds from './keybinds';
import Plugins from './plugins';

const CATEGORIES = [
  {
    name: 'general',
    Component: General,
  }, {
    name: 'keybinds',
    Component: Keybinds,
  }, {
    name: 'plugins',
    Component: Plugins,
  },
];

class Categories extends React.Component {
  render() {
    const {category} = this.props;

    const index = CATEGORIES.findIndex(({name}) => name === category);

    return (
      <div className='categories-container'>
        <div className='switcher'/>
        {
          CATEGORIES.map(
            ({name, Component}) => (
              <Component key={name}/>
            ),
          )
        }
        <style jsx>{`
            .categories-container {
              flex: 1;
              display: flex;
              overflow-x: hidden;
              background: var(--background-color);
            }

            .switcher {
              margin-left: -${index * 100}%;
              transition: margin 0.3s ease-in-out;
            }
        `}</style>
      </div>
    );
  }
}

Categories.propTypes = {
  category: PropTypes.string,
};

export default connect(
  [PreferencesContainer],
  ({category}) => ({category}),
)(Categories);
