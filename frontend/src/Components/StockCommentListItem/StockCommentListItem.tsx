import React from "react";
import { CommentGet } from "../../Models/Comment";

type Props = {
  comment: CommentGet;
};

const StockCommentListItem = ({ comment }: Props) => {
  return (
    <article className="term-panel px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="truncate text-[13px] font-medium text-term-text">{comment.title}</p>
        <p className="term-label">@{comment.createdBy}</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-term-muted">{comment.content}</p>
    </article>
  );
};

export default StockCommentListItem;
