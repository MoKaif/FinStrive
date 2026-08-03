import React from "react";
import { CommentGet } from "../../Models/Comment";
import StockCommentListItem from "../StockCommentListItem/StockCommentListItem";

type Props = {
  comments: CommentGet[];
};

const StockCommentList = ({ comments }: Props) => {
  if (!comments || comments.length === 0) return null;

  return (
    <div className="space-y-3">
      {comments.map((comment, index) => (
        <StockCommentListItem key={`${comment.createdBy}-${index}`} comment={comment} />
      ))}
    </div>
  );
};

export default StockCommentList;
