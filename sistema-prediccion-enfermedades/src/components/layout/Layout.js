import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        <Header />
        {children}
      </main>
    </div>
  );
};

export default Layout;