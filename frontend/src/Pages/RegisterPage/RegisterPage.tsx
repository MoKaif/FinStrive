import React from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAuth } from "../../Context/useAuth";
import { useForm } from "react-hook-form";

type Props = {};

type RegisterFormsInputs = {
  email: string;
  userName: string;
  password: string;
};

const validation = Yup.object().shape({
  email: Yup.string().required("Email is required"),
  userName: Yup.string().required("Username is required"),
  password: Yup.string().required("Password is required"),
});

const RegisterPage = (props: Props) => {
  const { registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormsInputs>({ resolver: yupResolver(validation) });

  const handleLogin = (form: RegisterFormsInputs) => {
    registerUser(form.email, form.userName, form.password);
  };
  return (
    <section className="min-h-screen flex items-center justify-center bg-background-dark relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/4 w-[1000px] h-[1000px] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/2 right-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 z-10 grid lg:grid-cols-2 gap-12 items-center h-full">
        {/* Left Side - Text */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 animate-slide-up order-2">
          <h1 className="text-6xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-secondary-light to-white">
            Start Your Journey.
          </h1>
          <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
            Join thousands of users building their financial future with FinStrive.
          </p>
          <div className="flex space-x-4">
            <div className="p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 flex-1">
              <div className="text-lg font-bold text-white mb-2">Portfolio Tracking</div>
              <div className="text-sm text-slate-400">Monitor your assets in real-time</div>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 flex-1">
              <div className="text-lg font-bold text-white mb-2">Smart Analysis</div>
              <div className="text-sm text-slate-400">AI-driven financial insights</div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full max-w-md mx-auto animate-fade-in order-1">
          <div className="glass-card p-8 md:p-10 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary rounded-t-xl"></div>

            <h2 className="text-3xl font-bold text-white mb-2 text-center">Create Account</h2>
            <p className="text-slate-400 text-center mb-8">Get started in seconds</p>

            <form className="space-y-5" onSubmit={handleSubmit(handleLogin)}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="name@company.com"
                  {...register("email")}
                />
                {errors.email && <p className="text-accent text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Choose a username"
                  {...register("userName")}
                />
                {errors.userName && <p className="text-accent text-sm mt-1">{errors.userName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && <p className="text-accent text-sm mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" className="w-full btn-primary bg-secondary hover:bg-secondary-light py-3 text-lg shadow-xl shadow-secondary/20">
                Create Account
              </button>

              <p className="text-center text-slate-400 text-sm mt-6">
                Already have an account?{" "}
                <a href="#" className="text-secondary-light font-medium hover:text-white transition-colors">Sign in</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
