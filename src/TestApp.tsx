import React from 'react';

const TestApp = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test App - React is Working!</h1>
      <p>If you can see this, React is loading correctly.</p>
      <button onClick={() => alert('Button works!')}>Test Button</button>
    </div>
  );
};

export default TestApp;
