import React from 'react';
import UserList from '../containers/user-list';
import UserDetails from '../containers/user-detail';
require('../../scss/style.scss');

const App = () => (
    <div>
      <div className="titleUserList">
        <h2>Avengers list</h2>
      </div>
        <UserList />
        <UserDetails />
    </div>
);

export default App;
