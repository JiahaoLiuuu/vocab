document.addEventListener('DOMContentLoaded', function() {
  // Storage service to abstract data operations
  const storageService = {
    // Keys for localStorage
    CURRENT_INDEX_KEY: 'flashcards-currentIndex',
    TERMS_ORDER_KEY: 'flashcards-termsOrder',
    IS_SHUFFLED_KEY: 'flashcards-isShuffled',
    BOOKMARKS_KEY: 'flashcards-bookmarks',
    
    // Save the current state
    saveState(currentIndex, terms, isShuffled) {
      localStorage.setItem(this.CURRENT_INDEX_KEY, currentIndex);
      localStorage.setItem(this.IS_SHUFFLED_KEY, isShuffled);
      
      // Save the current order of terms (just the indices)
      if (isShuffled) {
        const termIndices = terms.map(term => allTerms.findIndex(t => 
          t.word === term.word && t.explanation === term.explanation));
        localStorage.setItem(this.TERMS_ORDER_KEY, JSON.stringify(termIndices));
      } else {
        // If not shuffled, we don't need to save the order
        localStorage.removeItem(this.TERMS_ORDER_KEY);
      }
    },
    
    // Load saved state
    loadState() {
      const savedIndex = localStorage.getItem(this.CURRENT_INDEX_KEY);
      const isShuffled = localStorage.getItem(this.IS_SHUFFLED_KEY) === 'true';
      let savedTerms = null;
      
      if (isShuffled) {
        const termIndices = JSON.parse(localStorage.getItem(this.TERMS_ORDER_KEY) || '[]');
        if (termIndices.length > 0) {
          savedTerms = termIndices.map(index => allTerms[index]);
        }
      }
      
      return {
        currentIndex: savedIndex ? parseInt(savedIndex, 10) : 0,
        terms: savedTerms || [...allTerms],
        isShuffled: isShuffled
      };
    },
    
    // Clear saved state
    clearState() {
      localStorage.removeItem(this.CURRENT_INDEX_KEY);
      localStorage.removeItem(this.TERMS_ORDER_KEY);
      localStorage.removeItem(this.IS_SHUFFLED_KEY);
    },
    
    // Add to save bookmarked terms
    saveBookmark(termIndex, isBookmarked) {
      let bookmarks = this.getBookmarks();
      
      if (isBookmarked) {
        // Add to bookmarks if not already there
        if (!bookmarks.includes(termIndex)) {
          bookmarks.push(termIndex);
        }
      } else {
        // Remove from bookmarks
        bookmarks = bookmarks.filter(index => index !== termIndex);
      }
      
      localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
    },
    
    // Get all bookmarked term indices
    getBookmarks() {
      const savedBookmarks = localStorage.getItem(this.BOOKMARKS_KEY);
      return savedBookmarks ? JSON.parse(savedBookmarks) : [];
    },
    
    // Clear all bookmarks
    clearBookmarks() {
      localStorage.removeItem(this.BOOKMARKS_KEY);
    }
  };

  // Fetch vocabulary data from external JSON file
  let allTerms = [];
  let terms = [];
  let currentIndex = 0;
  let isExplanationVisible = false;
  let isSpeaking = false;
  let isShuffled = false;
  let bookmarkedTerms = [];
  let showingBookmarksOnly = false;

  // Fetch vocabulary data
  fetch('vocabulary.json')
    .then(response => response.json())
    .then(data => {
      allTerms = data;
      
      // Load the saved state
      const savedState = storageService.loadState();
      
      // Apply saved state
      currentIndex = savedState.currentIndex;
      terms = savedState.terms;
      isShuffled = savedState.isShuffled;
      bookmarkedTerms = storageService.getBookmarks();
      
      // Ensure we have valid terms after loading state
      if (!terms || terms.length === 0) {
        terms = [...allTerms];
      }
      
      // Make sure the currentIndex is valid
      if (currentIndex >= terms.length) {
        currentIndex = 0;
      }
      
      // Update the UI
      updateCard();
    })
    .catch(error => {
      console.error('Error loading vocabulary:', error);
      // Fallback to the embedded terms if JSON file fails to load
      loadEmbeddedTerms();
      
      // Load saved state after setting up the fallback terms
      const savedState = storageService.loadState();
      currentIndex = savedState.currentIndex;
      terms = savedState.terms;
      isShuffled = savedState.isShuffled;
      bookmarkedTerms = storageService.getBookmarks();
      
      // Ensure we have valid terms after loading state
      if (!terms || terms.length === 0) {
        terms = [...allTerms];
      }
      
      // Make sure the currentIndex is valid
      if (currentIndex >= terms.length) {
        currentIndex = 0;
      }
      
      updateCard();
    });

  // Fallback in case JSON file cannot be loaded
  function loadEmbeddedTerms() {
    allTerms = [
      { word: "Claim to be a US citizen", explanation: "To say you are a US citizen" },
      { word: "Claim", explanation: "To say something without proof" },
      // Add the rest of your terms here...
      { word: "Physical or developmental disability", explanation: "Anything about your body or mind that makes it difficult to do things like blindness" },
      { word: "Mental impairment", explanation: "When someone's brain works differently making some tasks challenging" }
    ];
  }
  
  // DOM elements
  const wordNumberElement = document.getElementById('word-number');
  const explanationElement = document.getElementById('explanation');
  const explanationContainer = document.querySelector('.explanation-container');
  const prevButton = document.getElementById('prev-btn');
  const nextButton = document.getElementById('next-btn');
  const counterElement = document.getElementById('counter');
  const speakWordButton = document.getElementById('speak-word');
  const speakExplanationButton = document.getElementById('speak-explanation');
  const shuffleButton = document.getElementById('shuffle-btn');
  const resetButton = document.getElementById('reset-btn');
  const toggleExplanationButton = document.getElementById('toggle-explanation');
  
  const bookmarkButton = document.getElementById('bookmark-btn');
  
  // Add show bookmarks button to controls
  const controlsContainer = document.querySelector('.controls');
  const showBookmarksButton = document.createElement('button');
  showBookmarksButton.textContent = 'Show Bookmarks';
  showBookmarksButton.id = 'show-bookmarks-btn';
  controlsContainer.appendChild(showBookmarksButton);
  
  // Load saved state from storage
  function loadSavedState() {
    const savedState = storageService.loadState();
    currentIndex = savedState.currentIndex;
    terms = savedState.terms;
    isShuffled = savedState.isShuffled;
    bookmarkedTerms = storageService.getBookmarks();
  }
  
  // Save current state to storage
  function saveCurrentState() {
    storageService.saveState(currentIndex, terms, isShuffled);
  }
  
  // Event listeners
  prevButton.addEventListener('click', showPreviousCard);
  nextButton.addEventListener('click', showNextCard);
  speakWordButton.addEventListener('click', speakWord);
  speakExplanationButton.addEventListener('click', speakExplanation);
  shuffleButton.addEventListener('click', shuffleCards);
  resetButton.addEventListener('click', resetCards);
  toggleExplanationButton.addEventListener('click', toggleExplanation);
  bookmarkButton.addEventListener('click', toggleBookmark);
  showBookmarksButton.addEventListener('click', toggleBookmarksView);
  
  // Functions
  function updateCard() {
    const term = terms[currentIndex];
    if (!term) return; // Guard against undefined terms
    
    wordNumberElement.textContent = `${currentIndex + 1}. ${term.word}`;
    explanationElement.textContent = term.explanation;
    counterElement.textContent = `${currentIndex + 1} / ${terms.length}`;
    
    // Update button states
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === terms.length - 1;
    
    // Reset explanation visibility when changing cards
    isExplanationVisible = false;
    explanationContainer.style.display = 'none';
    toggleExplanationButton.textContent = 'Show Explanation';
    
    // Update bookmark icon
    updateBookmarkIcon();
    
    // Save state after updating
    saveCurrentState();
  }
  
  function showPreviousCard() {
    if (currentIndex > 0) {
      currentIndex--;
      updateCard();
    }
  }
  
  function showNextCard() {
    if (currentIndex < terms.length - 1) {
      currentIndex++;
      updateCard();
    }
  }
  
  function speakExplanation() {
    const term = terms[currentIndex];
    speak(term.explanation, 0.7, speakExplanationButton); // Slower rate for explanations
  }
  
  function speakWord() {
    const term = terms[currentIndex];
    speak(term.word, 0.9, speakWordButton); // Regular rate for words
  }
  
  function speak(text, rate = 0.9, buttonElement = null) {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        
        // Reset all button appearances
        document.querySelectorAll('.speaker-btn .speaker-icon').forEach(icon => {
          icon.style.stroke = '#555';
        });
        return;
      }
      
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      
      isSpeaking = true;
      
      // Change button appearance if provided
      if (buttonElement) {
        const icon = buttonElement.querySelector('.speaker-icon');
        if (icon) icon.style.stroke = '#4a90e2'; // Change to theme color
      }
      
      utterance.onend = function() {
        isSpeaking = false;
        
        // Reset button appearance
        if (buttonElement) {
          const icon = buttonElement.querySelector('.speaker-icon');
          if (icon) icon.style.stroke = '#555';
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser doesn't support text-to-speech!");
    }
  }
  
  function toggleExplanation() {
    isExplanationVisible = !isExplanationVisible;
    if (isExplanationVisible) {
      explanationContainer.style.display = 'flex';
      toggleExplanationButton.textContent = 'Hide Explanation';
    } else {
      explanationContainer.style.display = 'none';
      toggleExplanationButton.textContent = 'Show Explanation';
    }
  }
  
  function shuffleCards() {
    terms = shuffleArray([...allTerms]);
    currentIndex = 0;
    isShuffled = true;
    showingBookmarksOnly = false;
    showBookmarksButton.textContent = 'Show Bookmarks';
    updateCard();
  }
  
  function resetCards() {
    terms = [...allTerms];
    currentIndex = 0;
    isShuffled = false;
    showingBookmarksOnly = false;
    showBookmarksButton.textContent = 'Show Bookmarks';
    updateCard();
    // Clear saved state when resetting
    storageService.clearState();
  }
  
  // Fisher-Yates shuffle algorithm
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  // Toggle bookmark status for current term
  function toggleBookmark() {
    const originalIndex = allTerms.findIndex(term => 
      term.word === terms[currentIndex].word && 
      term.explanation === terms[currentIndex].explanation
    );
    
    const isCurrentlyBookmarked = bookmarkedTerms.includes(originalIndex);
    
    // Toggle bookmark status
    if (isCurrentlyBookmarked) {
      bookmarkedTerms = bookmarkedTerms.filter(idx => idx !== originalIndex);
    } else {
      bookmarkedTerms.push(originalIndex);
    }
    
    // Save to storage
    storageService.saveBookmark(originalIndex, !isCurrentlyBookmarked);
    
    // Update icon
    updateBookmarkIcon();
  }
  
  // Update bookmark icon based on current term
  function updateBookmarkIcon() {
    const originalIndex = allTerms.findIndex(term => 
      term.word === terms[currentIndex].word && 
      term.explanation === terms[currentIndex].explanation
    );
    
    const isBookmarked = bookmarkedTerms.includes(originalIndex);
    const bookmarkIcon = bookmarkButton.querySelector('.bookmark-icon');
    
    if (isBookmarked) {
      bookmarkIcon.classList.add('active');
    } else {
      bookmarkIcon.classList.remove('active');
    }
  }
  
  // Toggle between all terms and bookmarked terms only
  function toggleBookmarksView() {
    showingBookmarksOnly = !showingBookmarksOnly;
    
    if (showingBookmarksOnly) {
      // Filter to show only bookmarked terms
      terms = allTerms.filter((_, index) => bookmarkedTerms.includes(index));
      showBookmarksButton.textContent = 'Show All Terms';
      
      // If no bookmarks, show message and revert
      if (terms.length === 0) {
        alert("You haven't bookmarked any terms yet!");
        terms = isShuffled ? shuffleArray([...allTerms]) : [...allTerms];
        showingBookmarksOnly = false;
        showBookmarksButton.textContent = 'Show Bookmarks';
      }
    } else {
      // Show all terms
      terms = isShuffled ? shuffleArray([...allTerms]) : [...allTerms];
      showBookmarksButton.textContent = 'Show Bookmarks';
    }
    
    // Reset to first card
    currentIndex = 0;
    updateCard();
  }
  
  // Add touch swipe functionality for mobile
  let touchstartX = 0;
  let touchendX = 0;
  const flashcard = document.querySelector('.flashcard');
  
  flashcard.addEventListener('touchstart', function(event) {
    touchstartX = event.changedTouches[0].screenX;
  }, {passive: true});
  
  flashcard.addEventListener('touchend', function(event) {
    touchendX = event.changedTouches[0].screenX;
    handleSwipe();
  }, {passive: true});
  
  function handleSwipe() {
    const threshold = 50; // Minimum swipe distance
    if (touchendX < touchstartX - threshold) {
      // Swiped left, go to next card
      showNextCard();
    }
    if (touchendX > touchstartX + threshold) {
      // Swiped right, go to previous card
      showPreviousCard();
    }
  }
  
  // Add double tap to speak word functionality
  let lastTap = 0;
  flashcard.addEventListener('touchend', function(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      const term = terms[currentIndex];
      speak(term.word, 0.9);
      event.preventDefault();
    }
    lastTap = currentTime;
  }, {passive: false});
});