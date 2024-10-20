import React, { useState } from 'react';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { SerpAPI } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";

const HomePage = () => {
  const [character1, setCharacter1] = useState('');
  const [character2, setCharacter2] = useState('');
  const [battleLog, setBattleLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const startBattle = async () => {
    setIsLoading(true);
    setBattleLog([]);

    const tools = [
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location: "Austin,Texas,United States",
        hl: "en",
        gl: "us",
      }),
      new Calculator(),
    ];

    const chat = new ChatOpenAI({ temperature: 0 });

    const executor = await createReactAgent({
      llm: chat,
      tools,
      verbose: true,
    });

    const input = `Create a battle scenario between ${character1} and ${character2}. Describe their abilities, strengths, and weaknesses. Then, simulate a turn-based battle between them, describing each action and its outcome. The battle should last for 5 turns. After the battle, declare a winner based on their performance.`;

    const result = await executor.call({ input });
    
    setBattleLog(result.output.split('\n'));
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-battle-bg bg-cover bg-center flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-battle text-battle-yellow mb-8">LLM-Battle Arena</h1>
      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          value={character1}
          onChange={(e) => setCharacter1(e.target.value)}
          placeholder="Enter Character 1"
          className="px-4 py-2 rounded bg-battle-gray text-black font-pixel"
        />
        <input
          type="text"
          value={character2}
          onChange={(e) => setCharacter2(e.target.value)}
          placeholder="Enter Character 2"
          className="px-4 py-2 rounded bg-battle-gray text-black font-pixel"
        />
      </div>
      <button
        onClick={startBattle}
        disabled={isLoading || !character1 || !character2}
        className="px-6 py-3 bg-battle-red text-white font-battle rounded hover:bg-battle-orange transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Battle in Progress...' : 'Start Battle!'}
      </button>
      <div className="mt-8 w-full max-w-2xl bg-black bg-opacity-75 p-4 rounded">
        {battleLog.map((log, index) => (
          <p key={index} className="text-battle-green font-pixel text-sm mb-2">{log}</p>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
