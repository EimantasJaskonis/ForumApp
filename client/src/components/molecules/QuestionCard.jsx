import React from 'react';
import styled from 'styled-components';
import Button from '../atoms/Button';

const Card = styled.div`
  background-color: #000;
  border: 1px solid #00ff00;
  border-radius: 4px;
  padding: 20px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 255, 0, 0.3);
  }
`;

const Title = styled.h3`
  color: #00ff00;
  margin-top: 0;
  margin-right: 40px;
`;

const LikeButton = styled.button`
  background-color: #000;
  color: #00FF00;
  border: 1px solid #00FF00;
  border-radius: 4px;
`;

const Meta = styled.div`
  color: #666666;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
`;

const Badge = styled.span`
  background-color: ${({ $answered }) => $answered ? '#00ff00' : '#666666'};
  color: #000;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
`;

const DeleteButton = styled(Button)`
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px 10px;
  font-size: 0.8rem;
`;

const QuestionCard = ({ questionData, onDelete, isOwner, onLike, onDislike }) => {
  const isAnswered = questionData.answers?.length > 0 || false;
  // const likes = question.likes || 0;

  return (
    <Card>
      <Title>{questionData.title}</Title>

      <LikeButton onClick={() => onLike(questionData._id)}>
        👍 {questionData.likes || 0}
      </LikeButton>
      <LikeButton onClick={() => onDislike(questionData._id)}>
        👎 {questionData.dislikes || 0}
      </LikeButton>

      {questionData.updatedAt && (
        <span style={{ color: '#666', fontSize: '0.8rem' }}>
          (edited)
        </span>
      )}

      {questionData.answers?.slice(0, 3).map((answer) => (
        <div key={answer._id || Math.random()} style={{ marginTop: '10px', color: '#00ff00' }}>
          <strong>A:</strong> {answer.answer}
        </div>
      ))}

      {questionData.answers?.length > 3 && (
        <div style={{ color: '#00ff00', marginTop: '5px' }}>
          +{questionData.answers.length - 3} more answers
        </div>
      )}

      <Meta>
        <div>
          Author: {questionData.userName} •{' '}
          {new Date(questionData.createdAt).toLocaleDateString()}
        </div>
        <Badge $answered={isAnswered}>
          {isAnswered ? `${questionData.answers.length} Answers` : 'No answer'}
        </Badge>
      </Meta>

      {isOwner && (
        <DeleteButton
          variant="danger"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </DeleteButton>
      )}
    </Card>
  );
};

export default QuestionCard;
