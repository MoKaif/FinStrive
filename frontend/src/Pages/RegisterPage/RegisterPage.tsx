import React from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
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
    <section className="flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <div className="border-b border-term-rule pb-4">
          <h1 className="font-display text-[24px] font-semibold leading-none tracking-tight text-term-text">
            Create account
          </h1>
          <p className="mt-2 text-[12px] text-term-muted">FinStrive · personal ledger</p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(handleLogin)}>
          <div>
            <label htmlFor="email" className="term-label mb-2 block">
              Email
            </label>
            <input
              id="email"
              type="text"
              autoComplete="email"
              className="term-input"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-2 text-[12px] text-term-loss">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="userName" className="term-label mb-2 block">
              Username
            </label>
            <input
              id="userName"
              type="text"
              autoComplete="username"
              className="term-input"
              {...register("userName")}
            />
            {errors.userName && (
              <p className="mt-2 text-[12px] text-term-loss">{errors.userName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="term-label mb-2 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="term-input"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-2 text-[12px] text-term-loss">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" className="term-btn-accent w-full justify-center py-2.5">
            Create account
          </button>
        </form>

        <p className="mt-6 border-t border-term-rule pt-4 text-[12px] text-term-muted">
          Already registered?{" "}
          <Link to="/login" className="term-focus text-term-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
};

export default RegisterPage;
