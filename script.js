```javascript
/* =========================================================
   QPG ARCADE — MAIN SCRIPT
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCaBL1WyyyZRoaG0bCc7bkN7nWVPSVHQYs",
  authDomain: "qpg-hub.firebaseapp.com",
  projectId: "qpg-hub",
  storageBucket: "qpg-hub.firebasestorage.app",
  messagingSenderId: "325678842839",
  appId: "1:325678842839:web:13fda7c8ce84f165654192",
  measurementId: "G-QJ43L8R2CQ"
};


/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   PAGE ELEMENTS
   ========================================================= */

const searchInput = document.getElementById("search");

const pills = Array.from(
  document.querySelectorAll(".pill[data-cat]")
);

const cards = Array.from(
  document.querySelectorAll("#games .card")
);

const gamesContainer = document.getElementById("games");

const gameCount = document.getElementById("game-count");

const resultsCount = document.getElementById("results-count");

const emptyState = document.getElementById("empty-state");

const emptyQuery = document.getElementById("empty-query");


/* ACCOUNT ELEMENTS */

const signedOut = document.getElementById("qpg-signed-out");

const signedIn = document.getElementById("qpg-signed-in");

const googleLogin = document.getElementById("qpg-google-login");

const githubLogin = document.getElementById("qpg-github-login");

const logoutButton = document.getElementById("qpg-logout");

const userPhoto = document.getElementById("qpg-user-photo");

const userName = document.getElementById("qpg-user-name");

const userUsername = document.getElementById("qpg-user-username");

const userEmail = document.getElementById("qpg-user-email");

const saveStatus = document.getElementById("qpg-save-status");


/* USERNAME ELEMENTS */

const usernameSetup = document.getElementById(
  "qpg-username-setup"
);

const usernameInput = document.getElementById(
  "qpg-username-input"
);

const usernameSave = document.getElementById(
  "qpg-username-save"
);

const usernameMessage = document.getElementById(
  "qpg-username-message"
);


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;

let currentCategory = "all";

let currentSearch = "";

let currentProfile = null;


/* =========================================================
   GAME COUNT
   ========================================================= */

function updateGameCounts() {

  const totalGames = cards.length;

  if (gameCount) {
    gameCount.textContent = totalGames;
  }

  pills.forEach(function (pill) {

    const category = pill.dataset.cat;

    const countElement =
      pill.querySelector(".count");

    if (!countElement) return;

    let count = totalGames;

    if (category !== "all") {

      count = cards.filter(function (card) {

        return card.dataset.cat === category;

      }).length;

    }

    countElement.textContent = ` (${count})`;

  });

}


/* =========================================================
   SEARCH + CATEGORY FILTERING
   ========================================================= */

function applyFilters() {

  const query =
    currentSearch.trim().toLowerCase();

  let visibleCount = 0;

  cards.forEach(function (card) {

    const categoryMatches =
      currentCategory === "all" ||
      card.dataset.cat === currentCategory;

    const searchableText =
      (
        card.dataset.search ||
        card.textContent ||
        ""
      ).toLowerCase();

    const searchMatches =
      !query ||
      searchableText.includes(query);

    const shouldShow =
      categoryMatches && searchMatches;

    card.hidden = !shouldShow;

    if (shouldShow) {
      visibleCount++;
    }

  });


  /* RESULTS TEXT */

  if (resultsCount) {

    if (query || currentCategory !== "all") {

      resultsCount.textContent =
        `Showing ${visibleCount} of ${cards.length} games`;

    } else {

      resultsCount.textContent =
        `${cards.length} games available`;

    }

  }


  /* EMPTY STATE */

  if (emptyState) {

    emptyState.hidden =
      visibleCount !== 0;

    if (emptyQuery) {

      if (query) {

        emptyQuery.textContent =
          currentSearch;

      } else {

        emptyQuery.textContent =
          "this category";

      }

    }

  }

}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

pills.forEach(function (pill) {

  pill.addEventListener("click", function () {

    currentCategory =
      pill.dataset.cat || "all";


    /* ACTIVE BUTTON */

    pills.forEach(function (otherPill) {

      otherPill.classList.toggle(
        "active",
        otherPill === pill
      );

    });


    applyFilters();


    /*
      When a category is clicked, move the user
      down to the games.
    */

    if (currentCategory !== "all" && gamesContainer) {

      setTimeout(function () {

        gamesContainer.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }, 50);

    }

  });

});


/* =========================================================
   SEARCH
   ========================================================= */

if (searchInput) {

  searchInput.addEventListener(
    "input",
    function () {

      currentSearch =
        searchInput.value;

      applyFilters();

    }
  );

}


/* =========================================================
   USERNAME VALIDATION
   ========================================================= */

function isValidUsername(username) {

  return /^[A-Za-z0-9_]{3,20}$/.test(
    username
  );

}


/* =========================================================
   USER PROFILE
   ========================================================= */

async function loadUserProfile(user) {

  if (!user) return null;

  const userRef =
    doc(db, "users", user.uid);

  const snapshot =
    await getDoc(userRef);

  if (!snapshot.exists()) {

    const newProfile = {

      profile: {

        uid: user.uid,

        displayName:
          user.displayName || "QPG Player",

        photoURL:
          user.photoURL || "",

        email:
          user.email || "",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),

        lastLoginAt:
          serverTimestamp()

      }

    };

    await setDoc(
      userRef,
      newProfile,
      { merge: true }
    );

    return newProfile;

  }


  await setDoc(
    userRef,
    {

      profile: {

        displayName:
          user.displayName || "QPG Player",

        photoURL:
          user.photoURL || "",

        email:
          user.email || "",

        updatedAt:
          serverTimestamp(),

        lastLoginAt:
          serverTimestamp()

      }

    },
    { merge: true }
  );


  return snapshot.data();

}


/* =========================================================
   ACCOUNT UI
   ========================================================= */

function showSignedOut() {

  if (signedOut) {
    signedOut.hidden = false;
  }

  if (signedIn) {
    signedIn.hidden = true;
  }

}


function showSignedIn(user, profile) {

  if (signedOut) {
    signedOut.hidden = true;
  }

  if (signedIn) {
    signedIn.hidden = false;
  }


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

      userPhoto.alt =
        user.displayName ||
        "QPG Player";

      userPhoto.hidden = false;

    } else {

      userPhoto.hidden = true;

    }

  }


  const username =
    profile &&
    profile.profile &&
    profile.profile.username;


  if (userUsername) {

    if (username) {

      userUsername.textContent =
        `@${username}`;

    } else {

      userUsername.textContent =
        "";

    }

  }


  if (usernameSetup) {

    usernameSetup.hidden =
      Boolean(username);

  }


  if (saveStatus) {

    saveStatus.textContent =
      "Signed in";

  }

}


/* =========================================================
   USERNAME MESSAGE
   ========================================================= */

function setUsernameMessage(
  message,
  type
) {

  if (!usernameMessage) return;

  usernameMessage.textContent =
    message;

  usernameMessage.className =
    type === "error"
      ? "qpg-error"
      : "qpg-success";

}


/* =========================================================
   CREATE UNIQUE USERNAME
   ========================================================= */

async function createUsername() {

  if (!currentUser) {

    setUsernameMessage(
      "Please sign in first.",
      "error"
    );

    return;

  }


  const username =
    (usernameInput?.value || "").trim();


  /* VALIDATE */

  if (!isValidUsername(username)) {

    setUsernameMessage(
      "Username must be 3–20 characters and use only letters, numbers, and underscores.",
      "error"
    );

    return;

  }


  const usernameLower =
    username.toLowerCase();


  if (usernameSave) {

    usernameSave.disabled = true;

    usernameSave.textContent =
      "Checking...";

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const usernameRef =
      doc(
        db,
        "usernames",
        usernameLower
      );


    await runTransaction(
      db,
      async function (transaction) {

        /*
          IMPORTANT:
          All reads happen before writes.
        */

        const usernameSnapshot =
          await transaction.get(
            usernameRef
          );

        const userSnapshot =
          await transaction.get(
            userRef
          );


        /* USERNAME ALREADY EXISTS */

        if (usernameSnapshot.exists()) {

          const existing =
            usernameSnapshot.data();

          if (
            existing.uid !==
            currentUser.uid
          ) {

            throw new Error(
              "USERNAME_TAKEN"
            );

          }

        }


        /* CHECK IF USER ALREADY HAS A USERNAME */

        const existingProfile =
          userSnapshot.exists()
            ? userSnapshot.data()
            : null;

        const existingUsername =
          existingProfile &&
          existingProfile.profile &&
          existingProfile.profile.username;


        if (
          existingUsername &&
          existingUsername !== username
        ) {

          throw new Error(
            "USERNAME_ALREADY_SET"
          );

        }


        /* CREATE USERNAME RESERVATION */

        transaction.set(
          usernameRef,
          {

            uid:
              currentUser.uid,

            username:
              username,

            usernameLower:
              usernameLower,

            createdAt:
              serverTimestamp()

          }
        );


        /* SAVE USER PROFILE */

        transaction.set(
          userRef,
          {

            profile: {

              uid:
                currentUser.uid,

              username:
                username,

              usernameLower:
                usernameLower,

              displayName:
                currentUser.displayName ||
                "QPG Player",

              photoURL:
                currentUser.photoURL ||
                "",

              email:
                currentUser.email ||
                "",

              updatedAt:
                serverTimestamp()

            }

          },
          { merge: true }
        );

      }
    );


    /* SUCCESS */

    currentProfile =
      await loadUserProfile(
        currentUser
      );


    showSignedIn(
      currentUser,
      currentProfile
    );


    setUsernameMessage(
      "Username created successfully!",
      "success"
    );


    if (usernameInput) {

      usernameInput.value =
        "";

    }


  } catch (error) {

    console.error(
      "Username error:",
      error
    );


    if (
      error.message ===
      "USERNAME_TAKEN"
    ) {

      setUsernameMessage(
        "That username is already taken. Try another one.",
        "error"
      );

    } else if (
      error.message ===
      "USERNAME_ALREADY_SET"
    ) {

      setUsernameMessage(
        "Your QPG username has already been set.",
        "error"
      );

    } else {

      setUsernameMessage(
        "Could not create the username. Please try again.",
        "error"
      );

    }

  } finally {

    if (usernameSave) {

      usernameSave.disabled = false;

      usernameSave.textContent =
        "Create username";

    }

  }

}


/* =========================================================
   USERNAME BUTTON
   ========================================================= */

if (usernameSave) {

  usernameSave.addEventListener(
    "click",
    createUsername
  );

}


if (usernameInput) {

  usernameInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        event.preventDefault();

        createUsername();

      }

    }
  );

}


/* =========================================================
   FIREBASE AUTH
   ========================================================= */

const googleProvider =
  new GoogleAuthProvider();

const githubProvider =
  new GithubAuthProvider();


/* =========================================================
   SIGN IN
   ========================================================= */

async function signIn(provider) {

  if (googleLogin) {
    googleLogin.disabled = true;
  }

  if (githubLogin) {
    githubLogin.disabled = true;
  }


  try {

    await setPersistence(
      auth,
      browserLocalPersistence
    );


    try {

      /*
        First try popup.
      */

      await signInWithPopup(
        auth,
        provider
      );


    } catch (popupError) {

      console.warn(
        "Popup sign-in failed:",
        popupError
      );


      /*
        These errors mean the browser may not
        allow the popup. In that case use redirect.
      */

      const redirectErrors = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/web-storage-unsupported"
      ];


      if (
        redirectErrors.includes(
          popupError.code
        )
      ) {

        await signInWithRedirect(
          auth,
          provider
        );

        return;

      }


      /*
        User simply closed the popup.
      */

      if (
        popupError.code ===
          "auth/popup-closed-by-user" ||
        popupError.code ===
          "auth/cancelled-popup-request"
      ) {

        return;

      }


      throw popupError;

    }

  } catch (error) {

    console.error(
      "Sign-in error:",
      error
    );


    if (saveStatus) {

      saveStatus.textContent =
        getAuthErrorMessage(error);

    }

  } finally {

    if (googleLogin) {
      googleLogin.disabled = false;
    }

    if (githubLogin) {
      githubLogin.disabled = false;
    }

  }

}


/* =========================================================
   AUTH ERROR MESSAGE
   ========================================================= */

function getAuthErrorMessage(error) {

  switch (error.code) {

    case "auth/unauthorized-domain":
      return "This QPG website is not authorized in Firebase yet.";

    case "auth/account-exists-with-different-credential":
      return "An account already exists with another sign-in method.";

    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Please allow popups for QPG.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";

    default:
      return "Sign-in failed. Please try again.";

  }

}


/* =========================================================
   GOOGLE BUTTON
   ========================================================= */

if (googleLogin) {

  googleLogin.addEventListener(
    "click",
    function () {

      signIn(
        googleProvider
      );

    }
  );

}


/* =========================================================
   GITHUB BUTTON
   ========================================================= */

if (githubLogin) {

  githubLogin.addEventListener(
    "click",
    function () {

      signIn(
        githubProvider
      );

    }
  );

}


/* =========================================================
   SIGN OUT
   ========================================================= */

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async function () {

      try {

        await signOut(auth);

      } catch (error) {

        console.error(
          "Sign-out error:",
          error
        );

      }

    }
  );

}


/* =========================================================
   HUB PROGRESS
   ========================================================= */

async function saveHubProgress(data) {

  if (!currentUser) {

    /*
      Guest mode:
      NEVER save progress.
    */

    return false;

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    await setDoc(
      userRef,
      {

        hubProgress: {

          ...data,

          updatedAt:
            serverTimestamp()

        }

      },
      { merge: true }
    );


    return true;

  } catch (error) {

    console.error(
      "Could not save hub progress:",
      error
    );

    return false;

  }

}


/* =========================================================
   LOAD HUB PROGRESS
   ========================================================= */

async function loadHubProgress() {

  if (!currentUser) {

    return null;

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(userRef);


    if (!snapshot.exists()) {

      return null;

    }


    return snapshot.data().hubProgress ||
      null;

  } catch (error) {

    console.error(
      "Could not load hub progress:",
      error
    );

    return null;

  }

}


/* =========================================================
   SAVE A GAME
   ========================================================= */

function makeSafeGameId(gameId) {

  return String(gameId || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

}


async function saveGameProgress(
  gameId,
  data
) {

  if (!currentUser) {

    /*
      IMPORTANT:
      Guests do not save progress.
    */

    return false;

  }


  const safeId =
    makeSafeGameId(gameId);


  if (!safeId) {

    return false;

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    await updateDoc(
      userRef,
      {

        [`games.${safeId}`]: {

          ...data,

          updatedAt:
            serverTimestamp()

        }

      }
    );


    return true;

  } catch (error) {

    /*
      If the user document does not exist yet,
      create it and try again.
    */

    try {

      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );


      await setDoc(
        userRef,
        {

          games: {

            [safeId]: {

              ...data,

              updatedAt:
                serverTimestamp()

            }

          }

        },
        { merge: true }
      );


      return true;

    } catch (secondError) {

      console.error(
        "Could not save game progress:",
        secondError
      );

      return false;

    }

  }

}


/* =========================================================
   LOAD A GAME
   ========================================================= */

async function loadGameProgress(
  gameId
) {

  if (!currentUser) {

    return null;

  }


  const safeId =
    makeSafeGameId(gameId);


  if (!safeId) {

    return null;

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(userRef);


    if (!snapshot.exists()) {

      return null;

    }


    const data =
      snapshot.data();

    const games =
      data.games || {};


    return games[safeId] || null;

  } catch (error) {

    console.error(
      "Could not load game progress:",
      error
    );

    return null;

  }

}


/* =========================================================
   DELETE GAME PROGRESS
   ========================================================= */

async function deleteGameProgress(
  gameId
) {

  if (!currentUser) {

    return false;

  }


  const safeId =
    makeSafeGameId(gameId);


  if (!safeId) {

    return false;

  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    await updateDoc(
      userRef,
      {

        [`games.${safeId}`]:
          deleteField()

      }
    );


    return true;

  } catch (error) {

    console.error(
      "Could not delete game progress:",
      error
    );

    return false;

  }

}


/* =========================================================
   PLAY HISTORY
   ========================================================= */

function getGameId(card) {

  const titleElement =
    card.querySelector("h2");

  const title =
    titleElement
      ? titleElement.textContent.trim()
      : "game";

  return makeSafeGameId(title);

}


async function recordGamePlayed(
  card
) {

  if (!currentUser) {

    /*
      Guest:
      do not save anything.
    */

    return;

  }


  const titleElement =
    card.querySelector("h2");

  const title =
    titleElement
      ? titleElement.textContent.trim()
      : "Unknown Game";

  const category =
    card.dataset.cat || "all";

  const id =
    getGameId(card);


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    const snapshot =
      await getDoc(userRef);

    const data =
      snapshot.exists()
        ? snapshot.data()
        : {};

    let history =
      Array.isArray(data.playHistory)
        ? data.playHistory
        : [];


    /*
      Remove previous copy of this game.
    */

    history =
      history.filter(function (item) {

        return item.id !== id;

      });


    /*
      Add latest play to beginning.
    */

    history.unshift({

      id: id,

      title: title,

      category: category,

      playedAt:
        Date.now()

    });


    /*
      Keep latest 50.
    */

    history =
      history.slice(0, 50);


    await setDoc(
      userRef,
      {

        playHistory: history,

        lastPlayed: {

          id: id,

          title: title,

          category: category,

          playedAt:
            Date.now()

        }

      },
      { merge: true }
    );


    displayRecommendations(
      history
    );

  } catch (error) {

    console.error(
      "Could not record game:",
      error
    );

  }

}


/* =========================================================
   RECOMMENDATIONS
   ========================================================= */

function ensureRecommendationSection() {

  let section =
    document.getElementById(
      "qpg-recommendations"
    );


  if (section) {

    return section;

  }


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
    "36px 0";


  section.innerHTML = `

    <div
      style="
        margin-bottom:16px;
      "
    >

      <h2
        style="
          margin:0 0 6px;
          font-family:var(--font-display);
        "
      >
        🎯 Recommended for You
      </h2>

      <p
        id="qpg-recommendation-text"
        style="
          margin:0;
          color:var(--ink-muted);
          font-size:14px;
        "
      ></p>

    </div>

    <div
      id="qpg-recommendation-list"
      class="games"
    ></div>

  `;


  gamesContainer.parentNode.insertBefore(
    section,
    gamesContainer
  );


  return section;

}


/* =========================================================
   GET RECOMMENDATIONS
   ========================================================= */

function getRecommendations(
  history,
  limit = 6
) {

  const playedIds =
    new Set(
      (history || []).map(
        function (item) {
          return item.id;
        }
      )
    );


  const categoryScores = {};


  (history || []).forEach(
    function (item) {

      if (!item.category) return;

      categoryScores[item.category] =
        (categoryScores[item.category] || 0) + 1;

    }
  );


  const sortedCategories =
    Object.keys(categoryScores)
      .sort(function (a, b) {

        return categoryScores[b] -
          categoryScores[a];

      });


  const candidates =
    cards.filter(function (card) {

      return !playedIds.has(
        getGameId(card)
      );

    });


  candidates.sort(function (a, b) {

    const aScore =
      categoryScores[a.dataset.cat] || 0;

    const bScore =
      categoryScores[b.dataset.cat] || 0;

    return bScore - aScore;

  });


  return candidates.slice(
    0,
    limit
  );

}


/* =========================================================
   CREATE RECOMMENDATION CARD
   ========================================================= */

function createRecommendationCard(
  originalCard
) {

  const card =
    originalCard.cloneNode(true);


  /*
    Remove duplicate IDs if there ever are any.
  */

  card.removeAttribute("id");


  card.addEventListener(
    "click",
    async function (event) {

      if (!currentUser) {

        /*
          Guest:
          normal navigation.
        */

        return;

      }


      event.preventDefault();

      await recordGamePlayed(
        originalCard
      );


      window.location.href =
        originalCard.href;

    }
  );


  return card;

}


/* =========================================================
   DISPLAY RECOMMENDATIONS
   ========================================================= */

function displayRecommendations(
  history = []
) {

  const section =
    ensureRecommendationSection();


  if (!section) return;


  const list =
    document.getElementById(
      "qpg-recommendation-list"
    );

  const text =
    document.getElementById(
      "qpg-recommendation-text"
    );


  if (!list) return;


  list.innerHTML = "";


  const recommendations =
    getRecommendations(
      history,
      6
    );


  /*
    Personalized message.
  */

  if (currentUser) {

    if (history.length === 0) {

      if (text) {

        text.textContent =
          "Start playing — your recommendations will become personalized as you play.";

      }

    } else {

      if (text) {

        text.textContent =
          "Based on the games you've played.";

      }

    }

  } else {

    if (text) {

      text.textContent =
        "Sign in to get personalized recommendations.";

    }

  }


  /*
    If all games have already been played,
    show a few games anyway.
  */

  let gamesToShow =
    recommendations;


  if (gamesToShow.length === 0) {

    gamesToShow =
      cards.slice(0, 6);

  }


  gamesToShow.forEach(
    function (originalCard) {

      list.appendChild(
        createRecommendationCard(
          originalCard
        )
      );

    }
  );

}


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  async function (user) {

    currentUser =
      user || null;


    if (!user) {

      currentProfile =
        null;

      showSignedOut();

      displayRecommendations(
        []
      );

      return;

    }


    try {

      currentProfile =
        await loadUserProfile(
          user
        );


      showSignedIn(
        user,
        currentProfile
      );


      /*
        Load saved hub progress.
      */

      const savedProgress =
        await loadHubProgress();


      if (savedProgress) {

        if (
          typeof savedProgress.search ===
          "string"
        ) {

          currentSearch =
            savedProgress.search;

          if (searchInput) {

            searchInput.value =
              currentSearch;

          }

        }


        if (
          typeof savedProgress.category ===
          "string"
        ) {

          const validCategories = [
            "all",
            "dodge",
            "rhythm",
            "puzzle",
            "party",
            "3d"
          ];


          if (
            validCategories.includes(
              savedProgress.category
            )
          ) {

            currentCategory =
              savedProgress.category;


            pills.forEach(
              function (pill) {

                pill.classList.toggle(
                  "active",
                  pill.dataset.cat ===
                    currentCategory
                );

              }
            );

          }

        }

      }


      applyFilters();


      /*
        Load play history.
      */

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const snapshot =
        await getDoc(userRef);

      const data =
        snapshot.exists()
          ? snapshot.data()
          : {};

      const history =
        Array.isArray(data.playHistory)
          ? data.playHistory
          : [];


      displayRecommendations(
        history
      );


    } catch (error) {

      console.error(
        "Account setup error:",
        error
      );

      showSignedIn(
        user,
        null
      );

      displayRecommendations(
        []
      );

    }

  }
);


/* =========================================================
   REDIRECT RESULT
   ========================================================= */

getRedirectResult(auth)
  .then(function (result) {

    /*
      onAuthStateChanged handles the actual
      signed-in state.

      This call mainly catches redirect errors.
    */

    if (result && result.user) {

      console.log(
        "Redirect sign-in successful."
      );

    }

  })
  .catch(function (error) {

    console.error(
      "Redirect sign-in error:",
      error
    );


    if (saveStatus) {

      saveStatus.textContent =
        getAuthErrorMessage(error);

    }

  });


/* =========================================================
   SAVE SEARCH / CATEGORY
   ========================================================= */

async function saveCurrentHubState() {

  if (!currentUser) {

    return;

  }


  await saveHubProgress({

    search:
      currentSearch,

    category:
      currentCategory

  });

}


/*
  Save after category changes.
*/

pills.forEach(function (pill) {

  pill.addEventListener(
    "click",
    function () {

      saveCurrentHubState();

    }
  );

});


/*
  Save after searching.
*/

if (searchInput) {

  let searchSaveTimer = null;

  searchInput.addEventListener(
    "input",
    function () {

      clearTimeout(
        searchSaveTimer
      );

      searchSaveTimer =
        setTimeout(
          saveCurrentHubState,
          500
        );

    }
  );

}


/* =========================================================
   GAME CARD CLICK TRACKING
   ========================================================= */

cards.forEach(function (card) {

  card.addEventListener(
    "click",
    async function (event) {

      /*
        Guests navigate normally.
        Nothing is saved.
      */

      if (!currentUser) {

        return;

      }


      /*
        Save play history before leaving.
      */

      event.preventDefault();


      const titleElement =
        card.querySelector("h2");

      const title =
        titleElement
          ? titleElement.textContent.trim()
          : "Game";


      if (saveStatus) {

        saveStatus.textContent =
          "Saving...";

      }


      await recordGamePlayed(
        card
      );


      await saveHubProgress({

        search:
          currentSearch,

        category:
          currentCategory,

        lastPlayed:
          title

      });


      if (saveStatus) {

        saveStatus.textContent =
          "Saved";

      }


      /*
        Now open the game.
      */

      window.location.href =
        card.href;

    }
  );

});


/* =========================================================
   PUBLIC QPG API FOR GAMES
   ========================================================= */

window.QPGCloud = {

  getUser: function () {

    return currentUser;

  },


  isSignedIn: function () {

    return Boolean(
      currentUser
    );

  },


  getUsername: function () {

    if (
      currentProfile &&
      currentProfile.profile
    ) {

      return (
        currentProfile.profile.username ||
        null
      );

    }

    return null;

  },


  saveGameProgress:
    saveGameProgress,


  loadGameProgress:
    loadGameProgress,


  deleteGameProgress:
    deleteGameProgress,


  recordGamePlayed:
    async function (
      gameTitle,
      category
    ) {

      if (!currentUser) {

        return false;

      }


      const fakeCard =
        cards.find(
          function (card) {

            const title =
              card.querySelector("h2");

            return (
              title &&
              title.textContent.trim() ===
                gameTitle
            );

          }
        );


      if (fakeCard) {

        await recordGamePlayed(
          fakeCard
        );

        return true;

      }


      /*
        Allows a future QPG game to record
        itself by title/category.
      */

      try {

        const userRef =
          doc(
            db,
            "users",
            currentUser.uid
          );

        const id =
          makeSafeGameId(
            gameTitle
          );


        const userSnapshot =
          await getDoc(
            userRef
          );

        const data =
          userSnapshot.exists()
            ? userSnapshot.data()
            : {};

        let history =
          Array.isArray(data.playHistory)
            ? data.playHistory
            : [];


        history =
          history.filter(
            function (item) {

              return item.id !== id;

            }
          );


        history.unshift({

          id: id,

          title:
            gameTitle,

          category:
            category || "all",

          playedAt:
            Date.now()

        });


        history =
          history.slice(0, 50);


        await setDoc(
          userRef,
          {

            playHistory:
              history,

            lastPlayed: {

              id: id,

              title:
                gameTitle,

              category:
                category || "all",

              playedAt:
                Date.now()

            }

          },
          { merge: true }
        );


        displayRecommendations(
          history
        );


        return true;

      } catch (error) {

        console.error(
          error
        );

        return false;

      }

    }

};


/* =========================================================
   INITIAL PAGE SETUP
   ========================================================= */

updateGameCounts();

applyFilters();

displayRecommendations([]);


/* =========================================================
   DONE
   ========================================================= */
```
