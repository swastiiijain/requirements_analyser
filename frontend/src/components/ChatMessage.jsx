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

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="max-w-xl px-4 py-2 rounded shadow bg-gray-200 text-gray-700">
      <div className="flex items-center space-x-1">
        <span className="text-sm">DocBot is thinking</span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
export { TypingIndicator }; 