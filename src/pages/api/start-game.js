import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import matchManager from '../../utils/matchManager';

const generateAgentName = (character) => {
  const prefixes = ['Passionate', 'Devoted', 'Dedicated', 'Loyal', 'Fervent'];
  const suffix = 'Fan';
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${character} ${suffix}`;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { characters } = req.body;

    try {
      const chat = new ChatGroq({
        temperature: 0.7,
        groqApiKey: process.env.GROQ_API_KEY,
      });

      const agentNames = characters.map(generateAgentName);

      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", "You are moderating a debate between two passionate fans of different characters. Your role is to introduce the debate and set the stage for an intense discussion."],
        ["human", `Introduce a debate about ${characters[0]} vs ${characters[1]} between ${agentNames[0]} and ${agentNames[1]}.
        Set the stage for an intense debate between these characters' fans, considering their potential strengths, weaknesses, and popular opinions.
        Encourage the debaters to argue passionately for their favorite character.`],
      ]);

      const chain = promptTemplate.pipe(chat);

      const result = await chain.invoke({});

      const matchId = Date.now().toString();
      const match = matchManager.createMatch(matchId, `${characters[0]} vs ${characters[1]}`, agentNames);

      match.chatLog.push({ agent: 'System', message: result.content });
      matchManager.updateMatch(matchId, match);

      res.status(200).json({ matchId: match.id, chatLog: match.chatLog, agents: agentNames });
    } catch (error) {
      console.error('Error starting the match:', error);
      res.status(500).json({ error: 'An error occurred while starting the match' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
