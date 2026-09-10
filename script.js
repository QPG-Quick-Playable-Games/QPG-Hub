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


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaBL1WYyyZRGA0bCc7bkN7nWVPSVqHQYs",
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

const accountPanel =
  document.getElementById("qpg-account-panel");

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
let progressLoaded = false;
let saveTimer = null;


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
      "bite-size browser games. Sign in to save your QPG progress."
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
  const q = search
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

    card.style.display = show ? "" : "none";

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
        (activeCat !== "all" ? activeCat : "");
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
  pill.addEventListener("click", function () {

    pills.forEach(function (p) {
      p.classList.remove("active");
    });

    pill.classList.add("active");

    activeCat = pill.dataset.cat;

    applyFilter();

    scheduleProgressSave();
  });
});


// =====================================================
// SEARCH
// =====================================================

if (search) {
  search.addEventListener("input", function () {
    applyFilter();
    scheduleProgressSave();
  });
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

  if (!currentUser) {
    return;
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
      doc(db, "users", currentUser.uid),
      {
        profile: {
          uid: currentUser.uid,
          displayName:
            currentUser.displayName || "",
          email:
            currentUser.email || "",
          photoURL:
            currentUser.photoURL || ""
        },

        hubProgress: data
      },
      {
        merge: true
      }
    );

    showSaveStatus("Progress saved");

  } catch (error) {

    console.error(
      "QPG progress save error:",
      error
    );

    showSaveStatus("Couldn't save progress");
  }
}


// =====================================================
// DEBOUNCED SAVE
// =====================================================

function scheduleProgressSave(extraData = {}) {

  if (!currentUser) {
    return;
  }

  clearTimeout(saveTimer);

  saveTimer = setTimeout(function () {
    saveHubProgress(extraData);
  }, 500);
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
        doc(db, "users", user.uid)
      );

    if (!snapshot.exists()) {
      progressLoaded = true;
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
      search.value = progress.search;
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

      pills.forEach(function (pill) {
        pill.classList.remove("active");
      });

      const matchingPill =
        document.querySelector(
          '#filters .pill[data-cat="' +
          activeCat +
          '"]'
        );

      if (matchingPill) {
        matchingPill.classList.add("active");
      }
    }

    applyFilter();

    progressLoaded = true;

    showSaveStatus("Progress loaded");

  } catch (error) {

    console.error(
      "QPG progress load error:",
      error
    );

    showSaveStatus("Couldn't load progress");
  }
}


// =====================================================
// SHOW SAVE STATUS
// =====================================================

function showSaveStatus(message) {

  if (!saveStatus) {
    return;
  }

  saveStatus.textContent = message;

  clearTimeout(
    showSaveStatus.timer
  );

  showSaveStatus.timer =
    setTimeout(function () {
      saveStatus.textContent = "";
    }, 2500);
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

    // Popup was blocked.
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
      (error.message || "Unknown error")
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
      signIn(googleProvider);
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
      signIn(githubProvider);
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

    signedOutPanel.hidden = true;
    signedInPanel.hidden = false;

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

    signedOutPanel.hidden = false;
    signedInPanel.hidden = true;

    if (userName) {
      userName.textContent = "";
    }

    if (userEmail) {
      userEmail.textContent = "";
    }
  }
}


// =====================================================
// GAME CARD CLICK = SAVE LAST PLAYED
// =====================================================

cards.forEach(function (card) {

  card.addEventListener(
    "click",
    async function (event) {

      if (!currentUser) {
        return;
      }

      event.preventDefault();

      const title =
        card.querySelector("h2")
          ?.textContent
          ?.trim() ||
        "Unknown Game";

      const href =
        card.getAttribute("href") ||
        "";

      await saveHubProgress({
        lastPlayed: {
          title: title,
          href: href,
          playedAt:
            new Date().toISOString()
        }
      });

      window.location.href = href;
    }
  );
});


// =====================================================
// PUBLIC QPG CLOUD API
// =====================================================
// Games can later use this to save REAL game data.
// Each individual game will need the Firebase connection
// added to its own code for actual game-state saving.
// =====================================================

window.QPGCloud = {

  getUser: function () {
    return auth.currentUser;
  },

  isSignedIn: function () {
    return !!auth.currentUser;
  },

  async saveGameProgress(
    gameId,
    gameData
  ) {

    const user =
      auth.currentUser;

    if (!user) {
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
            [gameId]: gameData
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

  async loadGameProgress(
    gameId
  ) {

    const user =
      auth.currentUser;

    if (!user) {
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
  }
};


// =====================================================
// HANDLE REDIRECT RESULT
// =====================================================

getRedirectResult(auth)
  .then(function (result) {

    if (result && result.user) {

      console.log(
        "QPG redirect sign-in successful."
      );
    }

  })
  .catch(function (error) {

    console.error(
      "Redirect result error:",
      error
    );
  });


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async function (user) {

    currentUser = user;

    updateAccountUI(user);

    if (user) {

      await loadHubProgress(user);

      // Create/update user profile.
      try {

        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {
            profile: {
              uid: user.uid,
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

      progressLoaded = false;

      showSaveStatus(
        "Guest mode — progress isn't saved"
      );

      applyFilter();
    }
  }
);


// INITIAL LOAD

applyFilter();
