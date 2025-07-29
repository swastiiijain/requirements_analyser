import React from 'react';

function ChatMessage({ sender, text }) {
  let classes = 'max-w-xl px-4 py-2 rounded shadow';
  if (sender === 'user') {
    classes += ' bg-blue-500 text-white self-end';
  } else if (sender === 'bot') {
    classes += ' bg-green-500 text-white';
  } else {
    classes += ' bg-gray-200 text-gray-800';
  }

  return <div className={classes}>{sender === 'system' ? <em>{text}</em> : text}</div>;
}

export default ChatMessage; 