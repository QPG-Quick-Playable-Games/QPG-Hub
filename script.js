```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "YOUR_CURRENT_FIREBASE_API_KEY",
  authDomain: "qpg-hub.firebaseapp.com",
  projectId: "qpg-hub",
  storageBucket: "qpg-hub.firebasestorage.app",
  messagingSenderId: "325678842839",
  appId: "1:325678842839:web:13fda7c8ce84f165654192",
  measurementId: "G-QJ43L8R2CQ"
};


// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// QPG HUB ELEMENTS
// =====================================================

const search = document.getElementById("search");

const pills = Array.from(
  document.querySelectorAll("#filters .pill")
);

const cards = Array.from(
  document.querySelectorAll("#games .card")
);

const resultsCount =
  document.getElementById("results-count");

const emptyState =
  document.getElementById("empty-state");

const emptyQuery =
  document.getElementById("empty-query");

const gameCountEl =
  document.getElementById("game-count");

const descriptionMeta =
  document.getElementById("page-description");

const signedOutPanel =
  document.getElementById("qpg-signed-out");

const signedInPanel =
  document.getElementById("qpg-signed-in");

const googleButton =
  document.getElementById("qpg-google-login");

const githubButton =
  document.getElementById("qpg-github-login");

const logoutButton =
  document.getElementById("qpg-logout");

const userPhoto =
  document.getElementById("qpg-user-photo");

const userName =
  document.getElementById("qpg-user-name");

const userEmail =
  document.getElementById("qpg-user-email");

const saveStatus =
  document.getElementById("qpg-save-status");


// =====================================================
// STATE
// =====================================================

let activeCat = "all";
let currentUser = null;
let saveTimer = null;
let progressLoaded = false;


// =====================================================
// GAME COUNT
// =====================================================

const totalGames = cards.length;

if (gameCountEl) {
  gameCountEl.textContent = totalGames;
}

if (descriptionMeta) {
  descriptionMeta.setAttribute(
    "content",
    totalGames +
      " bite-size browser games. Sign in to save your QPG progress."
  );
}


// =====================================================
// CATEGORY COUNTS
// =====================================================

pills.forEach(function (pill) {

  const cat = pill.dataset.cat;
  const count = pill.querySelector(".count");

  if (!count) {
    return;
  }

  const number =
    cat === "all"
      ? cards.length
      : cards.filter(function (card) {
          return card.dataset.cat === cat;
        }).length;

  count.textContent = " (" + number + ")";
});


// =====================================================
// FILTERING
// =====================================================

function applyFilter() {

  const q =
    search
      ? search.value.trim().toLowerCase()
      : "";

  let visible = 0;

  cards.forEach(function (card) {

    const matchesCat =
      activeCat === "all" ||
      card.dataset.cat === activeCat;

    const searchableText =
      card.dataset.search || "";

    const matchesQuery =
      !q ||
      searchableText.toLowerCase().includes(q);

    const show =
      matchesCat && matchesQuery;

    card.style.display =
      show ? "" : "none";

    if (show) {
      visible++;
    }
  });

  if (resultsCount) {

    resultsCount.textContent =
      visible +
      (visible === 1 ? " game" : " games");
  }

  if (visible === 0) {

    if (emptyState) {
      emptyState.hidden = false;
    }

    if (emptyQuery) {

      emptyQuery.textContent =
        q ||
        (activeCat !== "all"
          ? activeCat
          : "");
    }

  } else {

    if (emptyState) {
      emptyState.hidden = true;
    }
  }
}


// =====================================================
// CATEGORY BUTTONS
// =====================================================

pills.forEach(function (pill) {

  pill.addEventListener(
    "click",
    function () {

      pills.forEach(function (p) {
        p.classList.remove("active");
      });

      pill.classList.add("active");

      activeCat =
        pill.dataset.cat;

      applyFilter();

      scheduleProgressSave();
    }
  );
});


// =====================================================
// SEARCH
// =====================================================

if (search) {

  search.addEventListener(
    "input",
    function () {

      applyFilter();

      scheduleProgressSave();
    }
  );
}


// =====================================================
// FIREBASE AUTH PROVIDERS
// =====================================================

const googleProvider =
  new GoogleAuthProvider();

const githubProvider =
  new GithubAuthProvider();


// =====================================================
// SAVE HUB PROGRESS
// =====================================================

async function saveHubProgress(extraData = {}) {

  // IMPORTANT:
  // Guests NEVER save anything.

  if (!currentUser) {
    return false;
  }

  try {

    const data = {

      search:
        search
          ? search.value
          : "",

      activeCategory:
        activeCat,

      ...extraData,

      updatedAt:
        serverTimestamp()
    };

    await setDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {
        profile: {

          uid:
            currentUser.uid,

          displayName:
            currentUser.displayName || "",

          email:
            currentUser.email || "",

          photoURL:
            currentUser.photoURL || ""
        },

        hubProgress:
          data
      },
      {
        merge: true
      }
    );

    showSaveStatus(
      "Progress saved"
    );

    return true;

  } catch (error) {

    console.error(
      "QPG progress save error:",
      error
    );

    showSaveStatus(
      "Couldn't save progress"
    );

    return false;
  }
}


// =====================================================
// DEBOUNCED SAVE
// =====================================================

function scheduleProgressSave(
  extraData = {}
) {

  // Absolutely no guest saving.

  if (!currentUser) {
    return;
  }

  clearTimeout(saveTimer);

  saveTimer =
    setTimeout(
      function () {

        saveHubProgress(
          extraData
        );

      },
      500
    );
}


// =====================================================
// LOAD HUB PROGRESS
// =====================================================

async function loadHubProgress(user) {

  if (!user) {
    return;
  }

  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "users",
          user.uid
        )
      );

    if (!snapshot.exists()) {

      progressLoaded = true;

      buildRecommendations();

      return;
    }

    const data =
      snapshot.data();

    const progress =
      data.hubProgress || {};


    // Restore search

    if (
      search &&
      typeof progress.search === "string"
    ) {

      search.value =
        progress.search;
    }


    // Restore category

    if (
      progress.activeCategory &&
      document.querySelector(
        '#filters .pill[data-cat="' +
        progress.activeCategory +
        '"]'
      )
    ) {

      activeCat =
        progress.activeCategory;

      pills.forEach(
        function (pill) {
          pill.classList.remove(
            "active"
          );
        }
      );

      const matchingPill =
        document.querySelector(
          '#filters .pill[data-cat="' +
          activeCat +
          '"]'
        );

      if (matchingPill) {

        matchingPill.classList.add(
          "active"
        );
      }
    }


    applyFilter();

    progressLoaded = true;

    buildRecommendations();

    showSaveStatus(
      "Progress loaded"
    );

  } catch (error) {

    console.error(
      "QPG progress load error:",
      error
    );

    showSaveStatus(
      "Couldn't load progress"
    );
  }
}


// =====================================================
// SAVE STATUS
// =====================================================

function showSaveStatus(message) {

  if (!saveStatus) {
    return;
  }

  saveStatus.textContent =
    message;

  clearTimeout(
    showSaveStatus.timer
  );

  showSaveStatus.timer =
    setTimeout(
      function () {

        saveStatus.textContent =
          "";

      },
      2500
    );
}


// =====================================================
// SIGN IN
// =====================================================

async function signIn(provider) {

  try {

    await signInWithPopup(
      auth,
      provider
    );

  } catch (error) {

    console.error(
      "QPG sign-in error:",
      error
    );

    if (
      error.code ===
      "auth/popup-blocked"
    ) {

      try {

        await signInWithRedirect(
          auth,
          provider
        );

      } catch (redirectError) {

        console.error(
          "Redirect sign-in error:",
          redirectError
        );

        alert(
          "Sign-in could not start. Please try again."
        );
      }

      return;
    }

    if (
      error.code ===
      "auth/popup-closed-by-user"
    ) {
      return;
    }

    if (
      error.code ===
      "auth/cancelled-popup-request"
    ) {
      return;
    }

    alert(
      "Sign-in failed: " +
      (
        error.message ||
        "Unknown error"
      )
    );
  }
}


// =====================================================
// GOOGLE BUTTON
// =====================================================

if (googleButton) {

  googleButton.addEventListener(
    "click",
    function () {

      signIn(
        googleProvider
      );

    }
  );
}


// =====================================================
// GITHUB BUTTON
// =====================================================

if (githubButton) {

  githubButton.addEventListener(
    "click",
    function () {

      signIn(
        githubProvider
      );

    }
  );
}


// =====================================================
// LOG OUT
// =====================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async function () {

      try {

        await signOut(auth);

      } catch (error) {

        console.error(
          "QPG logout error:",
          error
        );

        alert(
          "Could not sign out."
        );
      }
    }
  );
}


// =====================================================
// DISPLAY ACCOUNT
// =====================================================

function updateAccountUI(user) {

  if (
    !signedOutPanel ||
    !signedInPanel
  ) {
    return;
  }

  if (user) {

    signedOutPanel.hidden =
      true;

    signedInPanel.hidden =
      false;

    if (userName) {

      userName.textContent =
        user.displayName ||
        "QPG Player";
    }

    if (userEmail) {

      userEmail.textContent =
        user.email || "";
    }

    if (userPhoto) {

      if (user.photoURL) {

        userPhoto.src =
          user.photoURL;

        userPhoto.hidden =
          false;

      } else {

        userPhoto.hidden =
          true;
      }
    }

  } else {

    signedOutPanel.hidden =
      false;

    signedInPanel.hidden =
      true;

    if (userName) {
      userName.textContent =
        "";
    }

    if (userEmail) {
      userEmail.textContent =
        "";
    }
  }
}


// =====================================================
// GET GAME INFORMATION
// =====================================================

function getGameInfo(card) {

  return {

    title:
      card.querySelector("h2")
        ?.textContent
        ?.trim() ||
      "Unknown Game",

    href:
      card.getAttribute("href") ||
      "",

    category:
      card.dataset.cat ||
      "all",

    description:
      card.querySelector("p")
        ?.textContent
        ?.trim() ||
      "",

    icon:
      card.querySelector(".icon")
        ?.textContent
        ?.trim() ||
      "🎮"
  };
}


// =====================================================
// RECOMMENDATION SYSTEM
// =====================================================

function getRecommendations(
  history = [],
  limit = 6
) {

  // Guests get no personalized recommendations.

  if (!currentUser) {
    return [];
  }

  const playedTitles =
    new Set(
      history.map(function (item) {
        return item.title;
      })
    );

  const categoryScores = {};

  history.forEach(
    function (item) {

      const category =
        item.category ||
        "all";

      categoryScores[category] =
        (categoryScores[category] || 0) +
        1;
    }
  );

  const available =
    cards
      .map(getGameInfo)
      .filter(function (game) {

        return !playedTitles.has(
          game.title
        );

      });

  available.sort(
    function (a, b) {

      const aScore =
        categoryScores[a.category] ||
        0;

      const bScore =
        categoryScores[b.category] ||
        0;

      if (aScore !== bScore) {
        return bScore - aScore;
      }

      return a.title.localeCompare(
        b.title
      );
    }
  );

  return available.slice(
    0,
    limit
  );
}


// =====================================================
// CREATE RECOMMENDATIONS SECTION
// =====================================================

function ensureRecommendationSection() {

  let section =
    document.getElementById(
      "qpg-recommendations"
    );

  if (section) {
    return section;
  }

  const gamesContainer =
    document.getElementById(
      "games"
    );

  if (!gamesContainer) {
    return null;
  }

  section =
    document.createElement(
      "section"
    );

  section.id =
    "qpg-recommendations";

  section.style.margin =
    "45px 0 35px";

  section.innerHTML = `
    <div style="
      border-top:1px solid var(--line);
      padding-top:30px;
    ">

      <h2 style="
        font-family:var(--font-display);
        font-size:24px;
        color:var(--ink);
        margin-bottom:8px;
      ">
        🎯 Recommended For You
      </h2>

      <p id="qpg-recommendation-subtitle" style="
        color:var(--ink-muted);
        margin-bottom:20px;
        font-size:14px;
      ">
        Games picked from your QPG activity.
      </p>

      <div id="qpg-recommendation-list" style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(220px,1fr));
        gap:14px;
      "></div>

    </div>
  `;

  gamesContainer.parentNode.insertBefore(
    section,
    gamesContainer
  );

  return section;
}


// =====================================================
// DISPLAY RECOMMENDATIONS
// =====================================================

function displayRecommendations(
  history = []
) {

  if (!currentUser) {
    return;
  }

  const section =
    ensureRecommendationSection();

  if (!section) {
    return;
  }

  const list =
    document.getElementById(
      "qpg-recommendation-list"
    );

  const subtitle =
    document.getElementById(
      "qpg-recommendation-subtitle"
    );

  if (!list) {
    return;
  }

  const recommendations =
    getRecommendations(
      history,
      6
    );

  list.innerHTML = "";

  if (
    recommendations.length === 0
  ) {

    if (subtitle) {

      subtitle.textContent =
        "You've played everything! More games coming soon.";
    }

    return;
  }

  if (subtitle) {

    if (history.length > 0) {

      subtitle.textContent =
        "Based on the games you've played.";

    } else {

      subtitle.textContent =
        "Start playing to make these recommendations smarter.";
    }
  }

  recommendations.forEach(
    function (game) {

      const link =
        document.createElement(
          "a"
        );

      link.href =
        game.href;

      link.className =
        "card qpg-recommendation-card";

      link.style.textDecoration =
        "none";

      link.innerHTML = `

        <span class="cat-tag">
          ${escapeHTML(
            getCategoryName(
              game.category
            )
          )}
        </span>

        <span class="icon">
          ${escapeHTML(game.icon)}
        </span>

        <h2>
          ${escapeHTML(game.title)}
        </h2>

        <p>
          ${escapeHTML(
            game.description
          )}
        </p>

      `;

      link.addEventListener(
        "click",
        async function (event) {

          if (!currentUser) {
            return;
          }

          event.preventDefault();

          await recordGamePlayed(
            game
          );

          window.location.href =
            game.href;
        }
      );

      list.appendChild(
        link
      );
    }
  );
}


// =====================================================
// BUILD RECOMMENDATIONS
// =====================================================

async function buildRecommendations() {

  if (!currentUser) {
    return;
  }

  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "users",
          currentUser.uid
        )
      );

    if (!snapshot.exists()) {

      displayRecommendations(
        []
      );

      return;
    }

    const data =
      snapshot.data();

    const history =
      data.playHistory || [];

    displayRecommendations(
      history
    );

  } catch (error) {

    console.error(
      "Recommendation error:",
      error
    );
  }
}


// =====================================================
// RECORD GAME PLAYED
// =====================================================

async function recordGamePlayed(
  game
) {

  // Guests NEVER record history.

  if (!currentUser) {
    return false;
  }

  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(
        userRef
      );

    let history = [];

    if (snapshot.exists()) {

      const data =
        snapshot.data();

      if (
        Array.isArray(
          data.playHistory
        )
      ) {

        history =
          data.playHistory;
      }
    }

    const playedAt =
      new Date().toISOString();

    const newEntry = {

      title:
        game.title,

      href:
        game.href,

      category:
        game.category,

      icon:
        game.icon,

      playedAt:
        playedAt
    };

    history =
      history.filter(
        function (item) {

          return item.title !==
            game.title;

        }
      );

    history.unshift(
      newEntry
    );

    // Keep the latest 50 games.

    history =
      history.slice(
        0,
        50
      );

    await setDoc(
      userRef,
      {

        playHistory:
          history,

        hubProgress: {

          lastPlayed: {

            title:
              game.title,

            href:
              game.href,

            category:
              game.category,

            playedAt:
              playedAt
          },

          updatedAt:
            serverTimestamp()
        }

      },
      {
        merge: true
      }
    );

    displayRecommendations(
      history
    );

    return true;

  } catch (error) {

    console.error(
      "Could not record game:",
      error
    );

    return false;
  }
}


// =====================================================
// GAME CARD CLICK = SAVE LAST PLAYED
// =====================================================

cards.forEach(
  function (card) {

    card.addEventListener(
      "click",
      async function (event) {

        // Guest:
        // DO NOT prevent normal navigation.
        // DO NOT save anything.

        if (!currentUser) {
          return;
        }

        event.preventDefault();

        const game =
          getGameInfo(card);

        await recordGamePlayed(
          game
        );

        await saveHubProgress({

          lastPlayed: {

            title:
              game.title,

            href:
              game.href,

            category:
              game.category,

            playedAt:
              new Date().toISOString()
          }

        });

        window.location.href =
          game.href;
      }
    );
  }
);


// =====================================================
// QPG CLOUD API
// =====================================================
// Individual QPG games can use this API.
//
// IMPORTANT:
// Nothing is saved for guests.
// A signed-in Firebase user is required.
// =====================================================

window.QPGCloud = {

  // ---------------------------------------------------
  // USER
  // ---------------------------------------------------

  getUser: function () {

    return auth.currentUser;
  },


  // ---------------------------------------------------
  // SIGNED IN?
  // ---------------------------------------------------

  isSignedIn: function () {

    return !!auth.currentUser;
  },


  // ---------------------------------------------------
  // SAVE GAME PROGRESS
  // ---------------------------------------------------

  async saveGameProgress(
    gameId,
    gameData
  ) {

    const user =
      auth.currentUser;

    // Guest = NEVER SAVE

    if (!user) {
      return false;
    }

    if (!gameId) {
      return false;
    }

    try {

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {

          games: {

            [gameId]: {

              ...gameData,

              savedAt:
                serverTimestamp()
            }
          },

          updatedAt:
            serverTimestamp()

        },
        {
          merge: true
        }
      );

      return true;

    } catch (error) {

      console.error(
        "Game progress save failed:",
        error
      );

      return false;
    }
  },


  // ---------------------------------------------------
  // LOAD GAME PROGRESS
  // ---------------------------------------------------

  async loadGameProgress(
    gameId
  ) {

    const user =
      auth.currentUser;

    // Guest = NEVER LOAD SAVED PROGRESS

    if (!user) {
      return null;
    }

    if (!gameId) {
      return null;
    }

    try {

      const snapshot =
        await getDoc(
          doc(
            db,
            "users",
            user.uid
          )
        );

      if (!snapshot.exists()) {
        return null;
      }

      const data =
        snapshot.data();

      if (
        !data.games ||
        !data.games[gameId]
      ) {

        return null;
      }

      return data.games[gameId];

    } catch (error) {

      console.error(
        "Game progress load failed:",
        error
      );

      return null;
    }
  },


  // ---------------------------------------------------
  // DELETE A GAME SAVE
  // ---------------------------------------------------

  async deleteGameProgress(
    gameId
  ) {

    const user =
      auth.currentUser;

    if (!user) {
      return false;
    }

    try {

      const snapshot =
        await getDoc(
          doc(
            db,
            "users",
            user.uid
          )
        );

      if (!snapshot.exists()) {
        return false;
      }

      const data =
        snapshot.data();

      const games =
        data.games || {};

      delete games[gameId];

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          games:
            games,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return true;

    } catch (error) {

      console.error(
        "Game progress delete failed:",
        error
      );

      return false;
    }
  }
};


// =====================================================
// CATEGORY NAME
// =====================================================

function getCategoryName(
  category
) {

  const names = {

    dodge:
      "Dodge & Dash",

    rhythm:
      "Rhythm & Reflex",

    puzzle:
      "Puzzle & Brain",

    party:
      "Party",

    "3d":
      "3D Games"
  };

  return (
    names[category] ||
    "QPG Games"
  );
}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    String(value);

  return div.innerHTML;
}


// =====================================================
// HANDLE REDIRECT RESULT
// =====================================================

getRedirectResult(auth)
  .then(
    function (result) {

      if (
        result &&
        result.user
      ) {

        console.log(
          "QPG redirect sign-in successful."
        );
      }

    }
  )
  .catch(
    function (error) {

      console.error(
        "Redirect result error:",
        error
      );
    }
  );


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async function (user) {

    currentUser =
      user;

    updateAccountUI(
      user
    );


    if (user) {

      // Signed in:
      // Load cloud data.

      await loadHubProgress(
        user
      );


      // Create/update profile.

      try {

        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {

            profile: {

              uid:
                user.uid,

              displayName:
                user.displayName || "",

              email:
                user.email || "",

              photoURL:
                user.photoURL || ""
            },

            lastLoginAt:
              serverTimestamp()

          },
          {
            merge: true
          }
        );

      } catch (error) {

        console.error(
          "Profile save error:",
          error
        );
      }

    } else {

      // =================================================
      // GUEST MODE
      // =================================================
      //
      // Absolutely no local saving.
      // Absolutely no Firebase saving.
      // Absolutely no recommendation history.
      //
      // The user can still search, filter and play.
      // =================================================

      progressLoaded =
        false;

      clearTimeout(
        saveTimer
      );

      showSaveStatus(
        "Guest mode — progress isn't saved"
      );

      applyFilter();

      const recommendationSection =
        document.getElementById(
          "qpg-recommendations"
        );

      if (
        recommendationSection
      ) {

        recommendationSection.remove();
      }
    }
  }
);


// =====================================================
// INITIAL LOAD
// =====================================================

applyFilter();
```
