
import React from 'react';

const DashboardHeader = ({ name, specialty }) => {
  return (
    <header className="mb-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-1">Bienvenido, {name}</h1>
      <p className="text-xl text-primary dark:text-blue-400">{specialty}</p>
    </header>
  );
};

export default DashboardHeader;
