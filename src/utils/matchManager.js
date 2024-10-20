class MatchManager {
  constructor() {
    this.matches = new Map();
  }

  createMatch(id, topic, agents) {
    const match = {
      id,
      topic,
      agents,
      chatLog: [],
    };
    this.matches.set(id, match);
    return match;
  }

  getMatch(id) {
    return this.matches.get(id);
  }

  updateMatch(id, updatedMatch) {
    this.matches.set(id, updatedMatch);
  }

  deleteMatch(id) {
    this.matches.delete(id);
  }
}

const matchManager = new MatchManager();
export default matchManager;
