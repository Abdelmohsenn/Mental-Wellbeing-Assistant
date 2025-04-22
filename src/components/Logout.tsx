import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface LogoutProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const Logout: React.FC<LogoutProps> = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  }, [setIsLoggedIn, navigate]);

  return null; // No UI
};

export default Logout;
