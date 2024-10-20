import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import matchManager from '../../utils/matchManager';

const MAX_HEALTH = 100;
const MAX_DAMAGE = 20;
const MIN_DAMAGE = 5;
const RESPONSE_TIME_LIMIT = 35000; // 35 seconds

const searchImage = async (query) => {
  const searchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 1,
  });

  const result = await searchTool.invoke(`${query} image`);
  return result && result.length > 0 && result[0].image ? result[0].image : null;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { matchId, health } = req.body;
    const match = matchManager.getMatch(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    try {
      const chat = new ChatGroq({ temperature: 0.7, groqApiKey: process.env.GROQ_API_KEY });
      
      const currentAgentIndex = match.chatLog.length % match.agents.length;
      const currentAgent = match.agents[currentAgentIndex];
      const nextAgentIndex = (currentAgentIndex + 1) % match.agents.length;
      const nextAgent = match.agents[nextAgentIndex];
      const characterName = currentAgent.split(' ')[1];

      const recentChatHistory = match.chatLog
        .filter(entry => entry.agent !== 'System')
        .slice(-2)
        .map(entry => `${entry.agent}: ${entry.message}`)
        .join('\n');

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are ${currentAgent}, a quick-witted debater for ${characterName}. Be concise, witty, and persuasive. Respond in 25 words or less. Optionally, suggest an image to illustrate your point by adding [IMAGE: description] at the end of your message.`],
        ["human", `Recent debate:
${recentChatHistory}

As ${currentAgent}, defend ${characterName} against ${nextAgent}'s arguments. Be quick and clever!`],
      ]);

      const chain = prompt.pipe(chat);

      const result = await Promise.race([
        chain.invoke({}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timed out')), RESPONSE_TIME_LIMIT))
      ]);

      let newMessage = { agent: currentAgent, message: 'Time limit exceeded. Skipping turn.' };
      let imageUrl = null;

      if (result && result.content) {
        const [message, imageRequest] = result.content.split('[IMAGE:');
        newMessage.message = message.trim();
        
        if (imageRequest) {
          const imageDescription = imageRequest.slice(0, -1).trim();
          imageUrl = await searchImage(`${characterName} ${imageDescription}`);
          if (imageUrl) {
            newMessage.message += ` [Image: ${imageUrl}]`;
          }
        }
      }

      match.chatLog.push(newMessage);

      const evaluationPrompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a quick judge evaluating debate arguments. Rate from 1-10 and explain in one short sentence."],
        ["human", `Evaluate: ${newMessage.message}

Format:
Rating: [1-10]
Explanation: [1 short sentence]`],
      ]);

      const evaluationChain = evaluationPrompt.pipe(chat);
      const evaluationResult = await evaluationChain.invoke({});

      const ratingMatch = evaluationResult.content.match(/Rating:\s*(\d+)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

      const damage = Math.floor(MIN_DAMAGE + (rating / 10) * (MAX_DAMAGE - MIN_DAMAGE));

      const newHealth = { ...health };
      newHealth[`character${nextAgentIndex + 1}`] = Math.max(0, newHealth[`character${nextAgentIndex + 1}`] - damage);

      let winner = null;
      if (newHealth.character1 <= 0) winner = match.agents[1];
      else if (newHealth.character2 <= 0) winner = match.agents[0];

      matchManager.updateMatch(matchId, match);

      res.status(200).json({ newMessage, health: newHealth, winner, damage, imageUrl });
    } catch (error) {
      console.error('Error processing game event:', error);
      res.status(500).json({ error: 'An error occurred while processing the game event', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
