import React from 'react';

const Header = () => {
  return (
    <header className="sticky top-0 z-10 flex justify-end items-center gap-2 px-6 py-3 bg-background-light/80 backdrop-blur-sm border-b border-[#dbe2e6]">
      <button className="p-2 text-[#212529] rounded-full hover:bg-gray-200">
        <span className="material-symbols-outlined">notifications</span>
      </button>
      <button className="p-2 text-[#212529] rounded-full hover:bg-gray-200">
        <span className="material-symbols-outlined">help</span>
      </button>
    </header>
  );
};

export default Header;