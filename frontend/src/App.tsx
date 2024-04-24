import { Outlet } from "react-router";
import Navbar from "./Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  return (
    <>
        <Navbar />
        <Outlet />
    </>
  );
}

export default App;
