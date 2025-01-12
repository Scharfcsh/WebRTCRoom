import { Toaster } from "react-hot-toast";
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import Dashboard from "./Pages/DashBoard";
import Register from "./Pages/Register";
import WebRTCApp from "./Pages/WebRTCApp";

function App() {
  const { authUser } = useAuthContext();
  return (
    <>
      <div className="h-full">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/login"
            element={
              authUser ? <Navigate to={"/chat"} replace={true} /> : <Login />
            }
          />

          <Route
            path="/chat"
            element={
              authUser ? <Dashboard /> : <Navigate to="/login" replace={true} />
            }
          />

          {/* <Route path="/error" element={<Error404 />} /> */}

          <Route
            path="/register"
            element={
              authUser ? <Navigate to={"/chat"} replace={true} /> : <Register />
            }
          />
        </Routes>
        <Toaster />
      </div>
      {/* <WebRTCApp /> */}
    </>
  );
}

export default App;
