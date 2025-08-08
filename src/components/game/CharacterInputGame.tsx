import React, { useState } from 'react';

export function CharacterInputGame() {
  const [userInput, setUserInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const renderCharacterBoxes = () => {
    const characters = userInput.split('');
    return characters.map((char, index) => (
      <div
        key={index}
        className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white shadow-sm m-1 text-xl font-medium"
      >
        {char}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          字符输入游戏
        </h1>
        <p className="text-lg text-center text-gray-600 mb-12">
          输入文字，看看有几个字符就会显示几个框
        </p>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <label htmlFor="textInput" className="block text-lg font-medium text-gray-700 mb-4">
            在这里输入文字：
          </label>
          <input
            id="textInput"
            type="text"
            value={userInput}
            onChange={handleInputChange}
            placeholder="请输入任何文字..."
            className="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>

        {userInput && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              字符框显示 ({userInput.length} 个字符)
            </h2>
            <div className="flex flex-wrap justify-center">
              {renderCharacterBoxes()}
            </div>
          </div>
        )}

        {!userInput && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-gray-400 text-lg">
              👆 开始输入文字，下方会显示对应的字符框
            </div>
          </div>
        )}
      </div>
    </div>
  );
}