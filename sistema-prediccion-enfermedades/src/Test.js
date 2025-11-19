import React from 'react';

const Test = () => {
  return (
    <div className="p-8">
      {/* Test de colores de Tailwind */}
      <div className="bg-primary p-4 text-white rounded-lg mb-4">
        Este debe ser naranja (#F97316) - Color primary
      </div>
      
      {/* Test de fuentes */}
      <div className="font-display text-2xl mb-4">
        Esta fuente debe ser Inter
      </div>
      
      {/* Test de grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-500 p-4 text-white">Col 1</div>
        <div className="bg-green-500 p-4 text-white">Col 2</div>
        <div className="bg-red-500 p-4 text-white">Col 3</div>
      </div>
    </div>
  );
};

export default Test;