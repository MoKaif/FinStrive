import React from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAuth } from "../../Context/useAuth";
import { useForm } from "react-hook-form";

type Props = {};

type LoginFormsInputs = {
  userName: string;
  password: string;
};

const validation = Yup.object().shape({
  userName: Yup.string().required("Username is required"),
  password: Yup.string().required("Password is required"),
});

const LoginPage = (props: Props) => {
  const { loginUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormsInputs>({ resolver: yupResolver(validation) });

  const handleLogin = (form: LoginFormsInputs) => {
    loginUser(form.userName, form.password);
  };
  return (
    <section className="min-h-screen flex items-center justify-center bg-background-dark relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="container mx-auto px-4 z-10 grid lg:grid-cols-2 gap-12 items-center h-full">
        {/* Left Side - Illustration/Text */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 animate-slide-up">
          <h1 className="text-6xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Master Your Finances.
          </h1>
          <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
            Take control of your wealth with FinStrive's advanced transaction tracking and portfolio management tools.
          </p>
          <div className="flex space-x-4">
            <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="text-3xl font-bold text-primary mb-1">100%</div>
              <div className="text-sm text-slate-400">Secure Data</div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="text-3xl font-bold text-secondary mb-1">24/7</div>
              <div className="text-sm text-slate-400">Real-time Sync</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto animate-fade-in">
          <div className="glass-card p-8 md:p-10 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent rounded-t-xl"></div>

            <h2 className="text-3xl font-bold text-white mb-2 text-center">Welcome Back</h2>
            <p className="text-slate-400 text-center mb-8">Sign in to continue your journey</p>

            <form className="space-y-6" onSubmit={handleSubmit(handleLogin)}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your username"
                  {...register("userName")}
                />
                {errors.userName && <p className="text-accent text-sm mt-1">{errors.userName.message}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">Password</label>
                  <a href="#" className="text-xs text-primary-light hover:text-white transition-colors">Forgot password?</a>
                </div>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && <p className="text-accent text-sm mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-lg shadow-xl shadow-primary/20">
                Sign In
              </button>

              <p className="text-center text-slate-400 text-sm mt-6">
                Don't have an account?{" "}
                <a href="#" className="text-primary-light font-medium hover:text-white transition-colors">Sign up now</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
