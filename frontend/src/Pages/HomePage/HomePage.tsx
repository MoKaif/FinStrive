import React, { useEffect } from "react";
import Hero from "../../Components/Hero/Hero";
import { useAuth } from "../../Context/useAuth";
import { useNavigate } from "react-router-dom";

type Props = {};

const HomePage = (props: Props) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/transactions");
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen bg-term-ink">
      <Hero />
    </div>
  );
};

export default HomePage;
