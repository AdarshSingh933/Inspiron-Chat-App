import React from "react";

interface Props {
  onLogin: () => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  return (
    <div className="card">
      <h2 className="title">Chat Application</h2>

      <p className="subtitle">Sign in to continue</p>

      <button className="login-btn" onClick={onLogin}>
        🔐 Sign in with Microsoft
      </button>
    </div>
  );
};

export default Login;