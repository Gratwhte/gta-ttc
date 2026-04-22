// =========================================================
// LEADERBOARD SYSTEM
// =========================================================
// Persists top 10 scores in browser localStorage.
// Score = money + (kills * 50) + (wantedLevelReached * 200)
// =========================================================

const LEADERBOARD_KEY = 'miniGTA_leaderboard';
const MAX_SCORES = 10;

const Leaderboard = {
  // Get all scores, sorted high-to-low
  getScores() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const scores = JSON.parse(raw);
      return Array.isArray(scores) ? scores.sort((a, b) => b.score - a.score) : [];
    } catch (e) {
      console.error('Leaderboard read error:', e);
      return [];
    }
  },

  // Add a score. Returns the rank (1-based) or null if not in top 10.
  addScore(entry) {
    const scores = this.getScores();
    scores.push({
      name: (entry.name || 'ANON').substring(0, 15).toUpperCase(),
      score: entry.score,
      money: entry.money,
      kills: entry.kills,
      maxWanted: entry.maxWanted,
      character: entry.character,
      date: new Date().toISOString().split('T')[0]
    });
    scores.sort((a, b) => b.score - a.score);
    const trimmed = scores.slice(0, MAX_SCORES);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    
    // Find rank of the new entry
    const rank = trimmed.findIndex(s =>
      s.name === (entry.name || 'ANON').substring(0, 15).toUpperCase() &&
      s.score === entry.score
    );
    return rank === -1 ? null : rank + 1;
  },

  // Will a given score make it into the top 10?
  qualifies(score) {
    const scores = this.getScores();
    if (scores.length < MAX_SCORES) return true;
    return score > scores[scores.length - 1].score;
  },

  // Returns the rank the score WOULD get (1-based)
  projectedRank(score) {
    const scores = this.getScores();
    let rank = 1;
    for (const s of scores) {
      if (score > s.score) return rank;
      rank++;
    }
    return rank <= MAX_SCORES ? rank : null;
  },

  clear() {
    localStorage.removeItem(LEADERBOARD_KEY);
  }
};

// ===== LEADERBOARD UI =====
function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  const scores = Leaderboard.getScores();
  
  if (scores.length === 0) {
    list.innerHTML = '<div class="noScores">No scores yet. Go cause some chaos!</div>';
    return;
  }
  
  list.innerHTML = scores.map((s, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank${rank}` : '';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    return `
      <div class="scoreRow ${rankClass}">
        <div class="scoreRank">${medal}</div>
        <div>
          <div class="scoreName">${s.name}</div>
          <div class="scoreChar">${s.character || '?'} · ${s.date || ''}</div>
        </div>
        <div class="scoreValue">${s.score.toLocaleString()}</div>
        <div class="scoreChar">💰$${(s.money||0).toLocaleString()}<br>💀${s.kills||0}</div>
      </div>
    `;
  }).join('');
}

function showLeaderboard() {
  renderLeaderboard();
  document.getElementById('leaderboardScreen').style.display = 'flex';
}

function hideLeaderboard() {
  document.getElementById('leaderboardScreen').style.display = 'none';
}

// Wire up buttons
document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
document.getElementById('closeLeaderboardBtn').addEventListener('click', hideLeaderboard);
document.getElementById('clearLeaderboardBtn').addEventListener('click', () => {
  if (confirm('Clear all scores? This cannot be undone.')) {
    Leaderboard.clear();
    renderLeaderboard();
  }
});
