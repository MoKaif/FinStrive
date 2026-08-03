import React from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
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
    <section className="flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <div className="border-b border-term-rule pb-4">
          <h1 className="font-display text-[24px] font-semibold leading-none tracking-tight text-term-text">
            Sign in
          </h1>
          <p className="mt-2 text-[12px] text-term-muted">FinStrive · personal ledger</p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(handleLogin)}>
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
              autoComplete="current-password"
              className="term-input"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-2 text-[12px] text-term-loss">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" className="term-btn-accent w-full justify-center py-2.5">
            Sign in
          </button>
        </form>

        <p className="mt-6 border-t border-term-rule pt-4 text-[12px] text-term-muted">
          No account?{" "}
          <Link to="/register" className="term-focus text-term-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
