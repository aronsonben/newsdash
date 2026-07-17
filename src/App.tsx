import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import NewsDashboard from './components/NewsDashboard';
import UsageIndicator from './components/UsageIndicator';
import MobileShortcutTray from './components/MobileShortcutTray';
import SavedBlockModal from './components/SavedBlockModal';
import SavedBlocksList from './components/SavedBlocksList';
import SaveBlockWarningModal from './components/SaveBlockWarningModal';
import UsernamePromptModal from './components/UsernamePromptModal';
import { generateStreamWithGemini} from './lib/geminiClient';
import { apiClient, firestoreCache } from './lib/apiClient';
import { CacheData, Shortcut, CloudSaveState, GeminiGenerateResponse, GeminiStreamResponse, SavedBlock } from './types';
import { FRESH_TTL_MS, CACHE_EXPIRY_MS, DEFAULT_SHORTCUT, NEWSDASH_CACHE_KEY } from './constants';
import { useLocalStorage } from './services/useLocalStorage';
import { useSavedBlocks } from './services/useSavedBlocks';
import { useAuth } from './services/useAuth';
import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firestore';
import { getCacheState } from './lib/utils';



export default function App() {
  // ––– STATE ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // Core Data
  const [selectedShortcut, setSelectedShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);   // the selected shortcut object
  const [newsData, setNewsData] = useState<GeminiGenerateResponse | null>(null);          // the gemini response data, if exists
  const [streamingText, setStreamingText] = useState<string>('');                         // memory holder for text being streamed from Gemini response, cleared after finish
  // App State
  const [loading, setLoading] = useState<boolean>(false);                                 // True if waiting for Gemini response
  const [error, setError] = useState<string | null>(null);                                // TODO: use this to elegantly display an error msg bar 
  const [isStreaming, setIsStreaming] = useState<boolean>(false);                         // indicates if app is currently streaming text from Gemini response
  const [isFetching, setIsFetching] = useState<boolean>(false);                           // 'true' indicates the app is fetching data when user switches between shortcuts
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>('idle');           // indicates the state of the 'save to cloud' functionality
  // Cache 
  const [promptCache, setPromptCache] = useLocalStorage<CacheData[]>(NEWSDASH_CACHE_KEY, []);   // localStorage Cache Object [{ shortcut1_obj }, { shortcut2_obj }, {...}]
  const [cachedIds, setCachedIds] = useState<string[]>([]);                               // array of cachedIds from promptCache for easier parsing 
  const [currentCacheObj, setCurrentCacheObj] = useState<CacheData | null>(null);         // if we find a cached obj in promptCache, set this as the obj of truth
  const [currentCacheState, setCurrentCacheState] = useState<string>('none');
  
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);              // TODO: OHH - I DONT NEED THIS, I SHOULD JUST USE promptCache FOR EACH OBJ. the time the current cache obj
  // LLM State
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  
  // Misc. state
  const [theme, setTheme] = useLocalStorage<string>('theme', 'dark');                     // css theme. defaults to dark.  
  const [storedUsername, setStoredUsername] = useLocalStorage<string>('newsdash_username', '');
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState<boolean>(false);
  const [anonPlaceholder, setAnonPlaceholder] = useState<string>('');

  // Auth
  const { user, loading: authLoading, signIn, signOut } = useAuth();

  // Migrate anonymous session blocks to Firestore on sign-in.
  // When the user was unauthenticated, blocks were saved to sessionStorage under
  // 'newsdash_saved_blocks'. Once they sign in, write each block to their
  // Firestore collection and clear the sessionStorage entry.
  useEffect(() => {
    if (!user) return;
    const raw = sessionStorage.getItem('newsdash_saved_blocks');
    if (!raw) return;
    let anonBlocks: SavedBlock[];
    try {
      anonBlocks = JSON.parse(raw) as SavedBlock[];
    } catch {
      sessionStorage.removeItem('newsdash_saved_blocks');
      return;
    }
    if (anonBlocks.length === 0) return;
    anonBlocks.forEach(block => {
      setDoc(doc(db, 'users', user.uid, 'saved_blocks', block.id), block).catch(() => {});
    });
    sessionStorage.removeItem('newsdash_saved_blocks');
  }, [user?.uid]);

  // Saved blocks
  const { blocks: savedBlocks, addBlock, updateBlock, removeBlock, limitReached } = useSavedBlocks(user?.uid ?? null);
  // pendingBlock: new block from a header click (not yet saved)
  const [pendingBlock, setPendingBlock] = useState<Omit<SavedBlock, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  // editingBlock: existing saved block being edited
  const [editingBlock, setEditingBlock] = useState<SavedBlock | null>(null);
  // warning modal for unauthenticated users attempting to save a block
  const [showSaveBlockWarning, setShowSaveBlockWarning] = useState<boolean>(false);
  const [pendingBlockForWarning, setPendingBlockForWarning] = useState<Omit<SavedBlock, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

  // Session-scoped user preferences (sessionStorage so they reset on each new browser session)
  const SESSION_PREFS_KEY = 'newsdash_user_prefs';
  const getSessionPrefs = (): Record<string, boolean> => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_PREFS_KEY) ?? '{}'); } catch { return {}; }
  };
  const setSessionPref = (key: string, value: boolean) => {
    try { sessionStorage.setItem(SESSION_PREFS_KEY, JSON.stringify({ ...getSessionPrefs(), [key]: value })); } catch {}
  };

  /**
   * Saves a block of text to localStorage for the user
   */
  const handleSaveBlock = (block: Omit<SavedBlock, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user && !getSessionPrefs().hasSeenSaveBlockWarning) {
      setPendingBlockForWarning(block);
      setShowSaveBlockWarning(true);
      return;
    }
    setPendingBlock(block);
  };

  /**
   * Warns the user that their saved blocks won't be persisted
   */
  const handleSaveBlockWarningSignIn = () => {
    setSessionPref('hasSeenSaveBlockWarning', true);
    setShowSaveBlockWarning(false);
    signIn();
    // The block will be available again after sign-in via the normal flow
    setPendingBlockForWarning(null);
  };

  const handleSaveBlockWarningAcknowledge = () => {
    setSessionPref('hasSeenSaveBlockWarning', true);
    setShowSaveBlockWarning(false);
    if (pendingBlockForWarning) {
      setPendingBlock(pendingBlockForWarning);
      setPendingBlockForWarning(null);
    }
  };

  const handleConfirmNew = (title: string, text: string) => {
    if (!pendingBlock) return;
    addBlock({ ...pendingBlock, title, text });
    setPendingBlock(null);
  };

  const handleConfirmEdit = (title: string, text: string) => {
    if (!editingBlock) return;
    updateBlock(editingBlock.id, { title, text });
    setEditingBlock(null);
  };

  const handleEditBlock = (block: SavedBlock) => setEditingBlock(block);

  const handleDiscardModal = () => {
    setPendingBlock(null);
    setEditingBlock(null);
  };

  // ––– EFFECTS ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

  // Auto-load cached data for the default shortcut on first mount
  useEffect(() => {
    handleShortcutSelect(DEFAULT_SHORTCUT);

    // TODO: put this in local state. safe to assume if configured once will be configured... also, i'm using my own API key so this check is kinda redundant.
    // let gemini = isGeminiConfigured();
    // console.log("[App] Gemini configured: ", gemini);
    // setGeminiConfigured(gemini);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const isDark = (theme === 'dark');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark-earth');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setTheme(isDark ? 'dark' : 'light');
  }, [theme]);
  
  // Check cache status for all shortcuts
  useEffect(() => {
    setCachedIds(promptCache.map(entry => entry.id))

    const inCache = promptCache.filter((pc) => (pc.id === selectedShortcut.id));
    const inCacheObj = inCache.length > 0 ? inCache[0] : null
    setCurrentCacheObj(inCacheObj);
    const cacheState = getCacheState(inCache[0]);
    setCurrentCacheState(cacheState);
    console.log("[App] Setting cacheObj status: ", inCacheObj?.id, " -- ", cacheState);
  }, [promptCache]);


  // Clear stale content as soon as a new request starts so the skeleton
  // is never blocked by old streamingText / newsData values.
  useEffect(() => {
    if (loading) {
      setStreamingText('');
      setNewsData(null);
    }
  }, [loading]);

  // ––– HANDLER & AUX FUNCTIONS ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

  const isExpired = (timestamp: number): boolean => {
    const timeDifference = (Date.now() - timestamp);
    return timeDifference > CACHE_EXPIRY_MS;
  }

  /**
   * Handles the selection of a shortcut from the sidebar by trying 
   * to load any stored response data for the given shortcut
   * @param shortcut - the selected shortcut
   * @returns 
   */
  const handleShortcutSelect = async (shortcut: Shortcut) => {
    const selectedShortcut = {
      id: shortcut.id,
      name: shortcut.name,
      description: shortcut.description,
      prompt: shortcut.prompt,
      icon: shortcut.icon,
      instructions: shortcut.instructions
    }
    
    // Reset cloud save state when switching shortcuts
    setCloudSaveState('idle');

    // Update selectedShortcut shortcut immediately (for ChatPanel)
    setSelectedShortcut(selectedShortcut);

    // Remove the cache references
    setCurrentCacheObj(null);
    setCurrentCacheState('none');

    // Clear the NewsDashboard immediately
    setNewsData(null);
    setStreamingText('');
    setIsFetching(true);
    
    // 1. Check localStorage first
    const cachedObj = promptCache.find((entry) => entry.id === selectedShortcut.id);

    // If the cache object was found in localStorage, make sure it hasn't expired:
    if (cachedObj) {
      console.log(`[handleShortcutSelect] Found a cached object in localStorage for ${selectedShortcut.id} `, cachedObj);

      // const cacheObjExpired = isExpired(new Date(cachedObj.updatedAt).getTime());
      const cacheObjState = getCacheState(cachedObj);

      // The cache object found in localStorage is expired...
      // TODO: tell the user they should run it again
      if (cacheObjState === 'expired') {
        console.log("[handleShortcutSelect] The cache has expired for: ", shortcut.id, ". Deleting from localStorage. You should run it again.");

        // Remove the existing cachedObj from the localStorage-based `promptCache`
        setPromptCache((prev) => prev.filter((entry) => entry.id !== cachedObj.id));
        // TODO: DO I NEED TO?? Clear the data for all the other state
        setNewsData(null);
        setIsFetching(false);
        return;
      } else {
        console.log("[handleShortcutSelect] We found the cache object, updating the UI for: ", shortcut.id);
        setNewsData(cachedObj.data);
        // setStreamingText(cachedObj.data.textWithCitations);
        setCurrentCacheObj(cachedObj);
        setCurrentCacheState(cacheObjState);
        // setCacheTimestamp(cachedObj.updatedAt);  // set timestamp to the date the response data in promptCache was cached at
        setIsFetching(false);
        return;
      }
    }

    // 2. Check Firestore for the object 
    try {
      const firestoreResult = await firestoreCache.read(selectedShortcut.id);
      if (firestoreResult.status === 'expired') {
        console.log("[handleShortcutSelect] Fetched the cached object from the database, but it is expired. You should run it again for the latest news.");
        setIsFetching(false);
        return;
      } else if (firestoreResult.status === 'fresh' || firestoreResult.status === 'stale') {
        console.log("[handleShortcutSelect] Fetched the cached object from the database.");
        const data = firestoreResult.data;
        const timestamp = new Date(firestoreResult.updatedAt).getTime();
        // We found a fresh cache object in the database, it's just not in this user's localStorage.
        // Hydrate localStorage so next visit is instant
        setPromptCache([data, ...promptCache]);
        setNewsData(data.data as GeminiGenerateResponse);
        setStreamingText(data.data.textWithCitations);
        setCloudSaveState('saved'); // already in Firestore
        setIsFetching(false);
        return;
      }
    } catch (err) {
      console.warn('[handleShortcutSelect] Firestore read failed:', err);
    }

    // 3. Both missed — clear previous data
    console.log("[App] Either the cache missed or it has expired. Try a new search to get the latest news.");
    setNewsData(null);
    // setIsCached(false);
    // setCacheTimestamp(null);   // set timestamp to null since we found no cache obj
    setIsFetching(false);
  };

  const performCloudSave = async (username: string) => {
    if (!newsData || !selectedShortcut) return;
    setCloudSaveState('saving');
    const success = await firestoreCache.save(selectedShortcut.id, newsData, username);
    setCloudSaveState(success ? 'saved' : 'error');
  };

  const handleSaveToCloud = async () => {
    if (!newsData || !selectedShortcut) return;
    if (!storedUsername) {
      const placeholder = `anonymous${Math.floor(100 + Math.random() * 900)}`;
      setAnonPlaceholder(placeholder);
      setIsUsernameModalOpen(true);
      return;
    }
    performCloudSave(storedUsername);
  };

  const handleUsernameConfirm = (username: string) => {
    setStoredUsername(username);
    setIsUsernameModalOpen(false);
    performCloudSave(username);
  };

  /**
   * When the Gemini response is fully streamed & parsed, this function sets app state
   * for several key data points. 
   * @param data - the full Gemini response data obj
   * @param fromCache - indicates whether the `data` obj came from the localStorage-based cache (`true`) or the database (`false`)
   * @param timestamp 
   */
  const handleResponse = (data: GeminiGenerateResponse, fromCache: boolean, timestamp?: number) => {
    setNewsData(data);

    // TODO: what are these doing
    // setCacheTimestamp(timestamp || null);
    // New response — allow saving to cloud
    setCloudSaveState('idle');
  };

  /**
   * Each time a streaming chunk from Gemini is parsed, this function is called
   * to set app state pertaining to Gemini response streaming.
   * @param text - the current chunk of streaming text
   * @param isComplete - whether or not streaming is finished
   */
  const handleStreamChunk = (text: string, isComplete: boolean) => {
    setStreamingText(text);
    setIsStreaming(!isComplete);
    if (isComplete) {
      // Clear streaming text when complete, let newsData handle final display
      setTimeout(() => setStreamingText(''), 100);
    }
  };

  // ––– CORE FEATURE FUNCTIONS ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

  /** Core feature function to send a request to the Gemini API, assuming all criteria are met */
  async function onSend(forceRefresh = false) {
    // if (!canSend) return;

    // Gather Prompt Info
    const promptId = selectedShortcut.id;         // no 'custom-prompt' option yet
    const promptText = selectedShortcut.prompt;   // just use prompt from selectedShortcut
    // const promptText = input.trim();           // no custom prompts, no need to handle user input (TO DELETE)
    
    // Set App State
    setLoading(true);
    setError(null);

    
    try {

      // TODO: I don't know what this is doing... 
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        console.log("onsend - !forceRefresh")
        const cached = promptCache.find((entry) => entry.id === promptId);
        if (cached) {
          // Use cached response
          handleStreamChunk(cached.data.textWithCitations, true);
          handleResponse(cached.data, true, cached.updatedAt); // true indicates from cache
          return;
        }
      }


      // TESTING, DELTE LATER
      // if (!import.meta.env.DEV) {
      //   apiClient.generate({
      //     prompt: promptText,
      //     instructions: selectedShortcut.instructions,
      //     temperature: 1.0,
      //     modelName: 'gemini-2.5-flash'
      //   });
      // }

      
      // We do not have a cached response here, so making fresh call to LLM
      // const streamResponse: GeminiStreamResponse = await generateStreamWithGemini({
      //   prompt: promptText,
      //   instructions: selectedShortcut.instructions,
      //   temperature: 1.0,
      //   modelName: 'gemini-2.5-flash'
      // });

      const streamResponse: GeminiStreamResponse = await apiClient.generate({
        prompt: promptText,
        instructions: selectedShortcut.instructions,
        temperature: 1.0,
        modelName: 'gemini-2.5-flash'
      });

      
      let accumulatedText = '';
      
      // Process the stream chunks from the LLM response
      for await (const chunk of streamResponse.stream) {
        if (!chunk.isComplete && chunk.text) {
          accumulatedText += chunk.text;
          handleStreamChunk(accumulatedText, false);
        }
      }
      
      // Get the full response with citations when streaming completes
      const fullResponse = await streamResponse.getFullResponse();

      // TODO: investigate whether this can be made more efficient
      // Update the prompt cache by either updating the existing one or adding a new one
      setPromptCache((prev) => {
        const now = Timestamp.now().toMillis();
        const existing = prev.find((entry) => entry.id === promptId);

        if (existing) {
          const updated = { ...existing, data: fullResponse, updatedAt: now };
          return [updated, ...prev.filter((entry) => entry.id !== promptId)];
        }

        const newPromptCache: CacheData = {
          id: promptId,
          data: fullResponse,
          updatedAt: now,
        };
        return [newPromptCache, ...prev];
      });
      
      // Send final response to NewsDashboard
      handleStreamChunk(fullResponse.textWithCitations, true);
      handleResponse(fullResponse, false); // false indicates fresh from API
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
      handleStreamChunk('Error generating response', true);
    } finally {
      setLoading(false);
    }
  }


  // ––– RETURN JSX –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

  return (
    <div className="flex flex-col min-h-screen font-grotesk bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))]">
      <Header isDark={(theme === 'dark')} toggleTheme={() => setTheme((theme === 'dark') ? 'light' : 'dark')} apiStatus={geminiConfigured} user={user} authLoading={authLoading} onSignIn={signIn} onSignOut={signOut} />
      <MobileShortcutTray onSelect={handleShortcutSelect} selectedId={selectedShortcut?.id} />
      <main className="flex-1 flex min-h-0">
        <Sidebar 
          selectedId={selectedShortcut.id} 
          cachedIds={cachedIds}
          onSelect={handleShortcutSelect}
          savedBlocks={savedBlocks}
          onEditBlock={handleEditBlock}
          onDeleteBlock={removeBlock}
          limitReached={limitReached}
        />
        <div className="flex-1 p-4 max-w-full md:max-w-240 mx-auto">
          <section className="mb-2">
            <p className="text-xs font-grotesk" style={{ color: 'rgb(var(--text-muted))' }}>
              Latest news summaries on interesting topics.
            </p>
          </section>
          <ChatPanel 
            shortcut={selectedShortcut}
            onSend={onSend}
            loading={loading}
            geminiConfigured={geminiConfigured}
          />
          <NewsDashboard 
            data={newsData} 
            isStreaming={isStreaming} 
            streamingText={streamingText} 
            onSaveToCloud={handleSaveToCloud}
            cloudSaveState={cloudSaveState}
            onRunAgain={onSend}
            loading={loading}
            isFetching={isFetching}
            currentCacheObj={currentCacheObj}
            currentCacheState={currentCacheState}
            onSaveBlock={handleSaveBlock}
          />
          {/* Mobile saved blocks — hidden on desktop (sidebar shows them there) */}
          <div className="md:hidden mt-6">
            <SavedBlocksList
              blocks={savedBlocks}
              onEdit={handleEditBlock}
              onDelete={removeBlock}
              limitReached={limitReached}
            />
          </div>
          <Outlet />
        </div>
      </main>
      
      {/* Floating Usage Indicator */}
      <div className="fixed bottom-16 right-4 rounded-lg shadow-lg px-2 py-1 border" style={{ backgroundColor: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-secondary))', borderColor: 'rgb(var(--border))' }}>
        <UsageIndicator />
      </div>
      
      <Footer />

      {/* Save block warning modal — shown once per session for unauthenticated users */}
      {showSaveBlockWarning && (
        <SaveBlockWarningModal
          onSignIn={handleSaveBlockWarningSignIn}
          onAcknowledge={handleSaveBlockWarningAcknowledge}
          onClose={() => { setShowSaveBlockWarning(false); setPendingBlockForWarning(null); }}
        />
      )}

      {/* Saved block modal — shown when creating a new block or editing an existing one */}
      {(pendingBlock || editingBlock) && (
        <SavedBlockModal
          block={editingBlock ?? pendingBlock!}
          onConfirm={editingBlock ? handleConfirmEdit : handleConfirmNew}
          onDiscard={handleDiscardModal}
          limitReached={editingBlock ? false : limitReached}
        />
      )}

      {/* Username prompt — shown on first-ever Save to Cloud */}
      <UsernamePromptModal
        isOpen={isUsernameModalOpen}
        defaultValue={user?.email ? user.email.split('@')[0] : anonPlaceholder}
        anonPlaceholder={anonPlaceholder}
        onConfirm={handleUsernameConfirm}
        onClose={() => setIsUsernameModalOpen(false)}
      />
    </div>
  );
}
