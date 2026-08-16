import React from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

type Props = {
  symbol: string;
  handleComment: (e: CommentFormInputs) => void;
};

type CommentFormInputs = {
  title: string;
  content: string;
};

const validation = Yup.object().shape({
  title: Yup.string().required("Title is required"),
  content: Yup.string().required("Content is required"),
});

const StockCommentForm = ({ symbol, handleComment }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommentFormInputs>({ resolver: yupResolver(validation) });

  return (
    <form className="space-y-3" onSubmit={handleSubmit(handleComment)}>
      <div>
        <label htmlFor="title" className="term-label mb-1.5 block">
          Title
        </label>
        <input type="text" id="title" className="term-input" {...register("title")} />
        {errors.title && <p className="mt-1.5 text-[12px] text-term-loss">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="comment" className="term-label mb-1.5 block">
          Note
        </label>
        <textarea
          id="comment"
          rows={4}
          className="term-input resize-none"
          placeholder={`What do you think about ${symbol}?`}
          {...register("content")}
        />
        {errors.content && <p className="mt-1.5 text-[12px] text-term-loss">{errors.content.message}</p>}
      </div>

      <button type="submit" className="term-btn-accent">
        Post note
      </button>
    </form>
  );
};

export default StockCommentForm;
