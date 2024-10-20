import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const MAX_HEALTH = 100;

const ChatBubble = ({ agent, message, avatar }) => {
  const imageUrlRegex = /\[Image: (https?:\/\/[^\s\]]+)\]/;
  const match = message.match(imageUrlRegex);
  const imageUrl = match ? match[1] : null;
  const messageWithoutImage = message.replace(imageUrlRegex, '').trim();

  return (
    <div className={`flex mb-2 ${agent.includes('1') ? 'justify-end' : 'justify-start'}`}>
      {!agent.includes('1') && (
        <div className="w-8 h-8 rounded-full bg-battle-gray mr-2 flex-shrink-0 overflow-hidden">
          <Image src={avatar} alt={agent} width={32} height={32} />
        </div>
      )}
      <div className={`chat-bubble ${agent.includes('1') ? 'agent1' : 'agent2'}`}>
        <div className="font-bold text-battle-yellow text-xs">{agent}</div>
        <div className="typing-animation text-sm">
          {messageWithoutImage}
          {imageUrl && (
            <div className="mt-2">
              <Image
                src={imageUrl}
                alt="Debate image"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
      {agent.includes('1') && (
        <div className="w-8 h-8 rounded-full bg-battle-gray ml-2 flex-shrink-0 overflow-hidden">
          <Image src={avatar} alt={agent} width={32} height={32} />
        </div>
      )}
    </div>
  );
};

const HomePage = () => {
  const [character1, setCharacter1] = useState('');
  const [character2, setCharacter2] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [health, setHealth] = useState({ character1: MAX_HEALTH, character2: MAX_HEALTH });
  const [currentTurn, setCurrentTurn] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  useEffect(() => {
    if (matchId && !winner) {
      const timer = setTimeout(continueBattle, 5000);
      return () => clearTimeout(timer);
    }
  }, [matchId, winner, chatLog]);

  const startDebate = async () => {
    setIsLoading(true);
    setChatLog([]);
    setWinner(null);
    setHealth({ character1: MAX_HEALTH, character2: MAX_HEALTH });
    setCurrentTurn(0);

    try {
      const response = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters: [character1, character2] }),
      });

      if (!response.ok) throw new Error('Failed to start the debate');

      const data = await response.json();
      setMatchId(data.matchId);
      setChatLog(data.chatLog.filter(entry => entry.agent !== 'System'));
      setAgents(data.agents);
      setCurrentTurn(1);
    } catch (error) {
      console.error('Error starting the debate:', error);
      setChatLog(['An error occurred while starting the debate.']);
    } finally {
      setIsLoading(false);
    }
  };

  const continueBattle = async () => {
    try {
      const response = await fetch('/api/game-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, health }),
      });

      if (!response.ok) throw new Error('Failed to process debate event');

      const data = await response.json();
      setChatLog(prevChatLog => [...prevChatLog, data.newMessage]);
      setHealth(data.health);
      setCurrentTurn(prevTurn => prevTurn + 1);
      
      // Display damage dealt
      const damageMessage = { agent: 'System', message: `${data.newMessage.agent} dealt ${data.damage} damage!` };
      setChatLog(prevChatLog => [...prevChatLog, damageMessage]);
      
      if (data.winner) setWinner(data.winner);
    } catch (error) {
      console.error('Error processing debate event:', error);
      setMatchId(null);
    }
  };

  const getCurrentAgent = () => agents[currentTurn % agents.length] || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-battle-blue to-battle-purple flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-4xl p-4 rounded-lg shadow-2xl">
        <h1 className="text-5xl font-battle text-battle-yellow mb-4 text-center animate-glow">Character Debate Arena</h1>
        
        <div className="mb-6 flex space-x-4">
          <input
            type="text"
            value={character1}
            onChange={(e) => setCharacter1(e.target.value)}
            placeholder="Enter Character 1"
            className="w-full px-4 py-3 rounded-lg bg-battle-gray text-black font-pixel focus:outline-none focus:ring-2 focus:ring-battle-yellow"
          />
          <span className="text-4xl font-battle text-battle-red self-center">VS</span>
          <input
            type="text"
            value={character2}
            onChange={(e) => setCharacter2(e.target.value)}
            placeholder="Enter Character 2"
            className="w-full px-4 py-3 rounded-lg bg-battle-gray text-black font-pixel focus:outline-none focus:ring-2 focus:ring-battle-yellow"
          />
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={startDebate}
            disabled={isLoading || !character1 || !character2 || matchId}
            className="px-10 py-4 bg-battle-red text-white font-battle text-3xl rounded-full hover:bg-battle-orange transition-colors disabled:opacity-50 animate-bounce shadow-neon"
          >
            {isLoading ? 'Debate in Progress...' : 'START DEBATE'}
          </button>
        </div>

        {agents.length > 0 && (
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-battle text-battle-yellow mb-2">Debaters:</h2>
            <p className="text-xl font-pixel">{agents[0]} vs {agents[1]}</p>
          </div>
        )}

        {matchId && (
          <div className="mb-2 flex justify-between items-center text-sm">
            <div className="w-1/3 pr-2">
              <div className="bg-battle-gray rounded-full h-3 overflow-hidden">
                <div
                  className="bg-battle-red h-full"
                  style={{ width: `${(health.character1 / MAX_HEALTH) * 100}%` }}
                ></div>
              </div>
              <p className="text-center mt-1 font-pixel text-xs">{character1}: {health.character1}</p>
            </div>
            <div className="w-1/3 text-center">
              <p className="font-battle text-lg text-battle-yellow">Turn {currentTurn}: {getCurrentAgent()}</p>
            </div>
            <div className="w-1/3 pl-2">
              <div className="bg-battle-gray rounded-full h-3 overflow-hidden">
                <div
                  className="bg-battle-blue h-full"
                  style={{ width: `${(health.character2 / MAX_HEALTH) * 100}%` }}
                ></div>
              </div>
              <p className="text-center mt-1 font-pixel text-xs">{character2}: {health.character2}</p>
            </div>
          </div>
        )}

        <div className="mt-4 h-80 overflow-y-auto scrollbar-custom w-full">
          {chatLog.filter(entry => entry.agent !== 'System').map((entry, index) => (
            <ChatBubble
              key={index}
              agent={entry.agent}
              message={entry.message}
              avatar={`/images/${entry.agent.includes('1') ? 'character1' : 'character2'}.png`}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {winner && (
          <div className="mt-4 text-3xl font-battle text-battle-yellow text-center animate-winner">
            Winner: {winner}!
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
