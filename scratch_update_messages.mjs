import fs from 'fs';

const filePath = 'src/views/Messages.jsx';
// Read and normalize all line endings to \n
let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

function doReplace(searchStr, replaceStr, label) {
  const normSearch = searchStr.replace(/\r\n/g, '\n');
  const normReplace = replaceStr.replace(/\r\n/g, '\n');
  if (code.includes(normSearch)) {
    code = code.replace(normSearch, normReplace);
    console.log(`[SUCCESS] ${label}`);
  } else {
    console.error(`[FAILED] ${label} - search pattern not found.`);
  }
}

// 1. Replace state declarations
const targetState = `  const { user } = useAuth();

  // Load state from localStorage or initial seed
  const [conversations, setConversations] = useState(() => {
    if (typeof window === 'undefined') return INITIAL_CONVERSATIONS;
    const saved = localStorage.getItem('buyoh_messages_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    const paramChatId = searchParams?.get('chatId');
    if (paramChatId && conversations.some(c => c.id === paramChatId)) {
      return paramChatId;
    }
    return conversations[0]?.id || 'chat-001';
  });`;

const replacementState = `  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);

  // Load authoritative real conversations for current user from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadConversations = async () => {
      if (!user) {
        setConversations([]);
        setIsLoadingConvs(false);
        return;
      }

      setIsLoadingConvs(true);
      try {
        const cloudConvs = await fetchUserConversations(user);
        if (isMounted) {
          setConversations(cloudConvs);
          const paramChatId = searchParams?.get('chatId');
          if (paramChatId && cloudConvs.some(c => c.id === paramChatId)) {
            setActiveChatId(paramChatId);
          } else if (cloudConvs.length > 0 && !activeChatId) {
            setActiveChatId(cloudConvs[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        if (isMounted) setIsLoadingConvs(false);
      }
    };

    loadConversations();

    // Subscribe to realtime incoming messages via Supabase
    let unsubscribe = () => {};
    if (user?.id) {
      unsubscribe = subscribeToRealtimeChat(user.id, (newMsg) => {
        setConversations(prev => {
          return prev.map(c => {
            if (c.id === newMsg.conversation_id) {
              const formatted = {
                id: newMsg.id,
                sender: 'them',
                sender_id: newMsg.sender_id,
                text: newMsg.text || '',
                isOffer: Boolean(newMsg.is_offer),
                offerAmount: Number(newMsg.offer_amount || 0),
                audioUrl: newMsg.audio_url || null,
                duration: newMsg.duration || null,
                time: newMsg.created_at ? new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
                timestamp: newMsg.created_at ? new Date(newMsg.created_at).getTime() : Date.now(),
                status: 'unread'
              };

              // Play notification chime
              const pushPref = typeof window !== 'undefined' ? localStorage.getItem('buyoh_pref_push') : null;
              const isPushActive = pushPref !== null ? JSON.parse(pushPref) : true;
              if (!c.isMuted && isPushActive) {
                playAudioTone(750, 600, 0.15);
              }

              return {
                ...c,
                messages: [...(c.messages || []), formatted],
                unreadCount: c.id === activeChatId ? (c.unreadCount || 0) : (c.unreadCount || 0) + 1
              };
            }
            return c;
          });
        });
      });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);`;

doReplace(targetState, replacementState, 'State hook replacement');

// 2. URL searchParams synchronization
const targetUrlSync = `  // Synchronize state with URL search parameters (handles browser Back button & back gestures)
  useEffect(() => {
    const paramChatId = searchParams.get('chatId');
    const prodId = searchParams.get('productId');
    const prodName = searchParams.get('prodName');
    const prodPrice = searchParams.get('prodPrice');
    const prodImg = searchParams.get('prodImg');
    const sellerName = searchParams.get('seller') || 'Verified Seller';

    if (paramChatId) {
      setActiveChatId(paramChatId);
      setIsMobileDetailOpen(true);
    } else if (prodId) {
      // Check if conversation already exists for this product
      const existing = conversations.find(c => c.product?.id === prodId);
      if (existing) {
        setActiveChatId(existing.id);
        setIsMobileDetailOpen(true);
      } else {
        // Create new conversation
        const newChat = {
          id: \`chat-\${Date.now()}\`,
          type: 'buying',
          contact: {
            name: sellerName,
            avatar: '',
            isOnline: true,
            verified: true,
            phone: '+234 800 000 0000',
            location: 'Lagos, Nigeria'
          },
          product: {
            id: prodId,
            name: prodName || 'Marketplace Item',
            price: Number(prodPrice) || 50000,
            image: prodImg || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            condition: 'Used'
          },
          unreadCount: 0,
          messages: [
            {
              id: \`m-\${Date.now()}\`,
              sender: 'them',
              text: \`Hello! Interested in my listing "\${prodName || 'Item'}"? Ask me any questions!\`,
              time: 'Just now',
              status: 'read'
            }
          ]
        };
        setConversations(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setIsMobileDetailOpen(true);
      }
    } else {
      // If no chatId or productId in URL parameters, close mobile detail view to show conversation list!
      setIsMobileDetailOpen(false);
    }
  }, [searchParams]);`;

const replacementUrlSync = `  // Synchronize state with URL search parameters (handles browser Back button & back gestures)
  useEffect(() => {
    const paramChatId = searchParams?.get('chatId');
    const prodId = searchParams?.get('productId');
    const prodName = searchParams?.get('prodName');
    const prodPrice = searchParams?.get('prodPrice');
    const prodImg = searchParams?.get('prodImg');
    const sellerId = searchParams?.get('sellerId') || '';
    const sellerName = searchParams?.get('seller') || 'Marketplace Seller';

    if (paramChatId) {
      setActiveChatId(paramChatId);
      setIsMobileDetailOpen(true);
    } else if (prodId && user) {
      // Check if conversation already exists in state
      const existing = conversations.find(c => String(c.product?.id) === String(prodId));
      if (existing) {
        setActiveChatId(existing.id);
        setIsMobileDetailOpen(true);
      } else {
        // Initialize or fetch cloud conversation
        const initChat = async () => {
          try {
            const res = await getOrCreateConversation({
              user,
              sellerId,
              productId: prodId,
              productDetails: { name: prodName, price: prodPrice, image: prodImg }
            });

            if (res.isSelf) {
              setToastMessage('You cannot chat with yourself on your own listing');
              setTimeout(() => setToastMessage(''), 3000);
              return;
            }

            const newChatObj = normalizeConversation({
              id: res.conversationId,
              buyer_id: user.id,
              seller_id: sellerId,
              product_id: prodId,
              contact: {
                name: sellerName,
                avatar: '',
                isOnline: true,
                verified: true,
                phone: '+234 800 000 0000',
                location: 'Nigeria'
              },
              product: {
                id: prodId,
                name: prodName || 'Marketplace Item',
                price: Number(prodPrice) || 0,
                image: prodImg || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
                condition: 'Used'
              },
              unread_count: 0,
              messages: []
            }, user.id);

            setConversations(prev => {
              if (prev.some(c => c.id === newChatObj.id)) return prev;
              return [newChatObj, ...prev];
            });
            setActiveChatId(newChatObj.id);
            setIsMobileDetailOpen(true);
          } catch (e) {
            console.error('Error creating chat:', e);
          }
        };
        initChat();
      }
    } else if (!paramChatId && !prodId) {
      setIsMobileDetailOpen(false);
    }
  }, [searchParams, user]);`;

doReplace(targetUrlSync, replacementUrlSync, 'URL sync replacement');

// 3. Mark read
const targetMarkRead = `  // Mark active chat as read
  useEffect(() => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId && c.unreadCount > 0) {
          return {
            ...c,
            unreadCount: 0,
            messages: c.messages.map(m => ({ ...m, status: 'read' }))
          };
        }
        return c;
      })
    );
  }, [activeChatId]);`;

const replacementMarkRead = `  // Mark active chat as read in memory and in Supabase
  useEffect(() => {
    if (!activeChatId) return;

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId && (c.unreadCount > 0 || c.messages?.some(m => m.sender === 'them' && m.status !== 'read'))) {
          return {
            ...c,
            unreadCount: 0,
            messages: (c.messages || []).map(m => ({ ...m, status: 'read' }))
          };
        }
        return c;
      })
    );

    if (user?.id) {
      markConversationAsRead(activeChatId, user.id);
    }
  }, [activeChatId, user?.id]);`;

doReplace(targetMarkRead, replacementMarkRead, 'Mark read replacement');

// 4. Send message
const targetSendMsg = `  // Function to send a text message
  const handleSendMessage = (textToSend = inputMessage, isOffer = false, offerVal = 0) => {
    const text = textToSend.trim();
    if (!text && !isOffer && !selectedAttachment) return;

    const nowTs = Date.now();
    const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: \`msg-\${nowTs}\`,
      sender: 'me',
      text: isOffer ? \`🏷️ Make an Offer: ₦\${Number(offerVal).toLocaleString('en-NG')}\` : text,
      isOffer: isOffer,
      offerAmount: offerVal,
      image: selectedAttachment ? selectedAttachment.previewUrl : null,
      timestamp: nowTs,
      time: timeNow,
      status: 'sent'
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    if (!isOffer) setInputMessage('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    // Simulate auto seller response after 1.2s
    setTimeout(() => {
      const replyText = isOffer
        ? \`Thanks for your offer of ₦\${Number(offerVal).toLocaleString('en-NG')}! Let me consider it and get back to you shortly.\`
        : AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];

      const replyTs = Date.now();
      const replyMsg = {
        id: \`msg-\${replyTs}\`,
        sender: 'them',
        text: replyText,
        timestamp: replyTs,
        time: new Date(replyTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'unread'
      };

      setConversations(prev => {
        const next = prev.map(c => {
          if (c.id === activeChatId) {
            // Play notification tone only if conversation is not muted and push notifications are active
            const pushPref = localStorage.getItem('buyoh_pref_push');
            const isPushActive = pushPref !== null ? JSON.parse(pushPref) : true;
            if (!c.isMuted && isPushActive) {
              playAudioTone(750, 600, 0.15);
            }
            return {
              ...c,
              messages: [...c.messages, replyMsg],
              unreadCount: c.id === activeChatId ? c.unreadCount : c.unreadCount + 1
            };
          }
          return c;
        });
        return next;
      });
    }, 1200);
  };`;

const replacementSendMsg = `  // Function to send a message (text or offer) with real two-way cloud persistence
  const handleSendMessage = async (textToSend = inputMessage, isOffer = false, offerVal = 0) => {
    const text = typeof textToSend === 'string' ? textToSend.trim() : '';
    if (!text && !isOffer && !selectedAttachment) return;
    if (!activeChat) return;

    const nowTs = Date.now();
    const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = isOffer ? \`🏷️ Proposed Offer: ₦\${Number(offerVal).toLocaleString('en-NG')}\` : text;

    const newMsg = {
      id: \`msg-\${nowTs}\`,
      sender: 'me',
      sender_id: user?.id,
      text: messageText,
      isOffer: Boolean(isOffer),
      offerAmount: Number(offerVal) || 0,
      image: selectedAttachment ? selectedAttachment.previewUrl : null,
      timestamp: nowTs,
      time: timeNow,
      status: 'sent'
    };

    // Optimistic UI update
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            messages: [...(c.messages || []), newMsg]
          };
        }
        return c;
      })
    );

    if (!isOffer) setInputMessage('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    // Persist to Supabase
    if (user?.id) {
      const counterpartId = activeChat.contact?.id || (activeChat.buyer_id === user.id ? activeChat.seller_id : activeChat.buyer_id);
      try {
        await sendCloudMessage({
          conversationId: activeChat.id,
          senderId: user.id,
          recipientId: counterpartId,
          text: messageText,
          isOffer,
          offerAmount: offerVal,
          productInfo: activeChat.product
        });
      } catch (err) {
        console.error('Error sending message to cloud:', err);
      }
    }
  };

  // Handle responding to an offer (Accept / Decline)
  const handleOfferResponse = async (offerVal, accepted) => {
    const text = accepted
      ? \`🤝 Offer of ₦\${Number(offerVal).toLocaleString('en-NG')} ACCEPTED! Let's arrange inspection and handover.\`
      : \`❌ Offer of ₦\${Number(offerVal).toLocaleString('en-NG')} declined. Thank you for your interest!\`;
    
    await handleSendMessage(text);
    setToastMessage(accepted ? 'Offer accepted!' : 'Offer declined.');
    setTimeout(() => setToastMessage(''), 2500);
  };`;

doReplace(targetSendMsg, replacementSendMsg, 'Send message replacement');

// 5. Filtered conversations
const targetFilter = `  // Filtering conversations (searches contact name, product title, and message content)
  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      c.contact.name.toLowerCase().includes(q) ||
      c.product.name.toLowerCase().includes(q) ||
      c.messages.some(m => m.text.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;
    if (filterTab === 'unread') return c.unreadCount > 0;
    if (filterTab === 'buying') return c.type === 'buying';
    if (filterTab === 'selling') return c.type === 'selling';
    return true;
  });`;

const replacementFilter = `  // Filtering conversations with safe optional chaining
  const filteredConversations = (conversations || []).filter(c => {
    if (!c) return false;
    const q = searchQuery.toLowerCase().trim();
    const contactName = (c.contact?.name || '').toLowerCase();
    const productName = (c.product?.name || '').toLowerCase();
    const matchesSearch = 
      !q ||
      contactName.includes(q) ||
      productName.includes(q) ||
      (Array.isArray(c.messages) && c.messages.some(m => (m.text || '').toLowerCase().includes(q)));
    
    if (!matchesSearch) return false;
    if (filterTab === 'unread') return (c.unreadCount || 0) > 0;
    if (filterTab === 'buying') return c.type === 'buying';
    if (filterTab === 'selling') return c.type === 'selling';
    return true;
  });`;

doReplace(targetFilter, replacementFilter, 'Filtered conversations replacement');

// 6. Unauthenticated view before return
const targetReturn = `  return (
    <div className="messages-page-wrapper">`;

const replacementReturn = `  // If user is not authenticated and auth check finished, render friendly prompt
  if (!authLoading && !user) {
    return (
      <div className="messages-page-wrapper">
        <header className="home-nav-row">
          <NavLink to="/" replace className="home-nav-brand">
            <span className="logo-infi">Infi</span><span className="logo-buy">Buy</span>
          </NavLink>
        </header>
        <div className="messages-auth-prompt-container">
          <div className="messages-auth-card">
            <div className="messages-auth-icon-circle">
              <MessageSquareMore size={40} color="#1d4ed8" />
            </div>
            <h2>Sign in to view your Messages</h2>
            <p>Connect with buyers and sellers, negotiate offers, and keep track of your transactions.</p>
            <NavLink to="/profile" className="messages-auth-btn">
              Sign In / Register
            </NavLink>
            <NavLink to="/" className="messages-auth-home-link">
              ← Return to marketplace
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page-wrapper">`;

doReplace(targetReturn, replacementReturn, 'Unauthenticated view replacement');

// 7. Sidebar item rendering
const targetSidebarItem = `              filteredConversations.map(chat => {
                const lastMsg = chat.messages[chat.messages.length - 1];
                const isSelected = chat.id === activeChatId;

                return (
                  <div
                    key={chat.id}
                    className={\`chat-item-card \${isSelected ? 'chat-item-selected' : ''}\`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div className="chat-avatar-wrap">
                      {renderContactAvatar(chat.contact.avatar, chat.contact.name, "chat-avatar")}
                      {chat.contact.isOnline && <span className="online-indicator" title="Online" />}
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-top">
                        <span className="contact-name">{chat.contact.name}</span>
                        <span className="chat-time">{formatSidebarDate(lastMsg)}</span>
                      </div>

                      <div className="product-mini-preview">
                        <Tag size={12} className="tag-icon" />
                        <span className="product-mini-name">{chat.product.name}</span>
                      </div>

                      <div className="chat-item-bottom">
                        <p className="last-message-text">
                          {lastMsg?.sender === 'me' && <span className="you-label">You: </span>}
                          {lastMsg?.text || 'No messages yet'}
                        </p>
                        <div className="chat-item-badges">
                          {chat.isMuted && <BellOff size={13} className="chat-muted-icon" title="Muted" />}
                          {chat.unreadCount > 0 && (
                            <span className="unread-badge">{chat.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })`;

const replacementSidebarItem = `              filteredConversations.map(chat => {
                const msgs = Array.isArray(chat.messages) ? chat.messages : [];
                const lastMsg = msgs[msgs.length - 1];
                const isSelected = chat.id === activeChatId;

                return (
                  <div
                    key={chat.id}
                    className={\`chat-item-card \${isSelected ? 'chat-item-selected' : ''}\`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div className="chat-avatar-wrap">
                      {renderContactAvatar(chat?.contact?.avatar, chat?.contact?.name, "chat-avatar")}
                      {chat?.contact?.isOnline && <span className="online-indicator" title="Online" />}
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-top">
                        <span className="contact-name">{chat?.contact?.name || 'User'}</span>
                        <span className="chat-time">{formatSidebarDate(lastMsg)}</span>
                      </div>

                      <div className="product-mini-preview">
                        <Tag size={12} className="tag-icon" />
                        <span className="product-mini-name">{chat?.product?.name || 'Listing'}</span>
                      </div>

                      <div className="chat-item-bottom">
                        <p className="last-message-text">
                          {lastMsg?.sender === 'me' && <span className="you-label">You: </span>}
                          {lastMsg?.text || 'No messages yet'}
                        </p>
                        <div className="chat-item-badges">
                          {chat?.isMuted && <BellOff size={13} className="chat-muted-icon" title="Muted" />}
                          {(chat?.unreadCount || 0) > 0 && (
                            <span className="unread-badge">{chat.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })`;

doReplace(targetSidebarItem, replacementSidebarItem, 'Sidebar item replacement');

// 8. Active chat header
const targetHeader = `              {/* Chat Top Header - Modern Advanced Design */}
              <div className="chat-main-header">
                {/* Left: Back + Avatar + Contact Info */}
                <div className="header-left">
                  <button
                    className="mobile-back-btn"
                    onClick={handleMobileBack}
                    title="Back to messages"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <button
                    className="header-avatar-btn"
                    onClick={() => setShowProfileModal(true)}
                    title="View profile"
                  >
                    <div className="contact-avatar-wrap">
                      {renderContactAvatar(activeChat.contact.avatar, activeChat.contact.name, "contact-avatar")}
                      {activeChat.contact.isOnline && <span className="online-indicator" />}
                    </div>
                  </button>

                  <div className="header-contact-meta">
                    <div className="contact-name-row">
                      <h3 className="contact-heading">{activeChat.contact.name}</h3>
                      {activeChat.contact.verified && (
                        <ShieldCheck size={14} className="verified-badge-icon" title="Verified Seller" />
                      )}
                      {activeChat.isMuted && (
                        <BellOff size={14} className="header-muted-indicator" title="Muted" />
                      )}
                    </div>
                    <p className="contact-status-text">
                      {isTyping ? (
                        <span className="typing-indicator">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-label">typing...</span>
                        </span>
                      ) : activeChat.contact.isOnline ? (
                        <span className="text-online">● Online</span>
                      ) : (
                        <span className="text-offline">● Offline · {activeChat.contact.location}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="chat-header-actions">
                  {/* Search in chat */}
                  <button
                    className={\`header-icon-btn \${isChatSearchOpen ? 'header-icon-btn-active' : ''}\`}
                    onClick={() => setIsChatSearchOpen(prev => !prev)}
                    title="Search in conversation"
                  >
                    <Search size={19} />
                  </button>

                  {/* Mute toggle */}
                  <button
                    className={\`header-icon-btn \${activeChat.isMuted ? 'header-icon-btn-muted' : ''}\`}
                    onClick={() => {
                      setConversations(prev =>
                        prev.map(c => {
                          if (c.id === activeChat.id) {
                            const nextMuted = !c.isMuted;
                            setToastMessage(nextMuted ? 'Notifications muted' : 'Notifications unmuted');
                            setTimeout(() => setToastMessage(''), 2500);
                            return { ...c, isMuted: nextMuted };
                          }
                          return c;
                        })
                      );
                    }}
                    title={activeChat.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                  >
                    {activeChat.isMuted ? <BellOff size={19} /> : <Bell size={19} />}
                  </button>

                  {/* Call button */}
                  <a
                    href={\`tel:\${activeChat.contact.phone}\`}
                    className="header-call-btn"
                    title={\`Call \${activeChat.contact.name}\`}
                  >
                    <Phone size={18} />
                    <span className="call-btn-text">Call</span>
                  </a>

                  {/* 3-dots Dropdown Menu */}
                  <div className="more-menu-wrapper" ref={menuRef}>
                    <button
                      className="header-icon-btn"
                      onClick={() => setIsMenuOpen(prev => !prev)}
                      title="More options"
                    >
                      <MoreVertical size={20} className="more-menu-icon" />
                    </button>

                    {isMenuOpen && (
                      <div className="chat-options-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowProfileModal(true);
                          }}
                        >
                          <User size={17} className="dropdown-icon" />
                          <span>View profile</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            toggleFollowSeller(activeChat.contact.name);
                          }}
                        >
                          {isFollowingSeller(activeChat.contact.name) ? (
                            <>
                              <UserMinus size={17} className="dropdown-icon text-danger" />
                              <span className="text-danger">Unfollow seller</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={17} className="dropdown-icon text-primary" />
                              <span className="text-primary">Follow seller</span>
                            </>
                          )}
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsChatSearchOpen(true);
                          }}
                        >
                          <Search size={17} className="dropdown-icon" />
                          <span>Search in conversation</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleMoveToSpam(activeChat.id);
                          }}
                        >
                          <AlertCircle size={17} className="dropdown-icon" />
                          <span>Move to spam</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleReportSeller(activeChat.contact.name);
                          }}
                        >
                          <Flag size={17} className="dropdown-icon" />
                          <span>Report this seller</span>
                        </button>

                        <div className="dropdown-divider" />

                        <button
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleDeleteChat(activeChat.id);
                          }}
                        >
                          <Trash2 size={17} className="dropdown-icon danger-icon" />
                          <span className="text-danger">Delete chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Context Strip - shown when chat has an associated product */}
              {activeChat.product && (
                <div className="product-context-strip">
                  <img
                    src={activeChat.product.image}
                    alt={activeChat.product.name}
                    className="product-strip-img"
                  />
                  <div className="product-strip-info">
                    <span className="product-strip-label">Chatting about</span>
                    <span className="product-strip-name">{activeChat.product.name}</span>
                  </div>
                  <span className="product-strip-price">₦{activeChat.product.price?.toLocaleString()}</span>
                </div>
              )}`;

const replacementHeader = `              {/* Chat Top Header - Modern Advanced Design */}
              <div className="chat-main-header">
                {/* Left: Back + Avatar + Contact Info */}
                <div className="header-left">
                  <button
                    className="mobile-back-btn"
                    onClick={handleMobileBack}
                    title="Back to messages"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <button
                    className="header-avatar-btn"
                    onClick={() => setShowProfileModal(true)}
                    title="View profile"
                  >
                    <div className="contact-avatar-wrap">
                      {renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "contact-avatar")}
                      {activeChat?.contact?.isOnline && <span className="online-indicator" />}
                    </div>
                  </button>

                  <div className="header-contact-meta">
                    <div className="contact-name-row">
                      <h3 className="contact-heading">{activeChat?.contact?.name || 'User'}</h3>
                      {activeChat?.contact?.verified && (
                        <ShieldCheck size={14} className="verified-badge-icon" title="Verified Seller" />
                      )}
                      {activeChat?.isMuted && (
                        <BellOff size={14} className="header-muted-indicator" title="Muted" />
                      )}
                    </div>
                    <p className="contact-status-text">
                      {isTyping ? (
                        <span className="typing-indicator">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-label">typing...</span>
                        </span>
                      ) : activeChat?.contact?.isOnline ? (
                        <span className="text-online">● Online</span>
                      ) : (
                        <span className="text-offline">● Offline{activeChat?.contact?.location ? \` · \${activeChat.contact.location}\` : ''}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="chat-header-actions">
                  {/* Search in chat */}
                  <button
                    className={\`header-icon-btn \${isChatSearchOpen ? 'header-icon-btn-active' : ''}\`}
                    onClick={() => setIsChatSearchOpen(prev => !prev)}
                    title="Search in conversation"
                  >
                    <Search size={19} />
                  </button>

                  {/* Mute toggle */}
                  <button
                    className={\`header-icon-btn \${activeChat?.isMuted ? 'header-icon-btn-muted' : ''}\`}
                    onClick={() => {
                      setConversations(prev =>
                        prev.map(c => {
                          if (c.id === activeChat.id) {
                            const nextMuted = !c.isMuted;
                            setToastMessage(nextMuted ? 'Notifications muted' : 'Notifications unmuted');
                            setTimeout(() => setToastMessage(''), 2500);
                            return { ...c, isMuted: nextMuted };
                          }
                          return c;
                        })
                      );
                    }}
                    title={activeChat?.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                  >
                    {activeChat?.isMuted ? <BellOff size={19} /> : <Bell size={19} />}
                  </button>

                  {/* Call button */}
                  {activeChat?.contact?.phone && (
                    <a
                      href={\`tel:\${activeChat.contact.phone}\`}
                      className="header-call-btn"
                      title={\`Call \${activeChat.contact.name || 'User'}\`}
                    >
                      <Phone size={18} />
                      <span className="call-btn-text">Call</span>
                    </a>
                  )}

                  {/* 3-dots Dropdown Menu */}
                  <div className="more-menu-wrapper" ref={menuRef}>
                    <button
                      className="header-icon-btn"
                      onClick={() => setIsMenuOpen(prev => !prev)}
                      title="More options"
                    >
                      <MoreVertical size={20} className="more-menu-icon" />
                    </button>

                    {isMenuOpen && (
                      <div className="chat-options-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowProfileModal(true);
                          }}
                        >
                          <User size={17} className="dropdown-icon" />
                          <span>View profile</span>
                        </button>

                        {activeChat?.contact?.name && (
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setIsMenuOpen(false);
                              toggleFollowSeller(activeChat.contact.name);
                            }}
                          >
                            {isFollowingSeller(activeChat.contact.name) ? (
                              <>
                                <UserMinus size={17} className="dropdown-icon text-danger" />
                                <span className="text-danger">Unfollow seller</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={17} className="dropdown-icon text-primary" />
                                <span className="text-primary">Follow seller</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsChatSearchOpen(true);
                          }}
                        >
                          <Search size={17} className="dropdown-icon" />
                          <span>Search in conversation</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleMoveToSpam(activeChat.id);
                          }}
                        >
                          <AlertCircle size={17} className="dropdown-icon" />
                          <span>Move to spam</span>
                        </button>

                        {activeChat?.contact?.name && (
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setIsMenuOpen(false);
                              handleReportSeller(activeChat.contact.name);
                            }}
                          >
                            <Flag size={17} className="dropdown-icon" />
                            <span>Report this seller</span>
                          </button>
                        )}

                        <div className="dropdown-divider" />

                        <button
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleDeleteChat(activeChat.id);
                          }}
                        >
                          <Trash2 size={17} className="dropdown-icon danger-icon" />
                          <span className="text-danger">Delete chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Context Strip - shown when chat has an associated product */}
              {activeChat?.product && (
                <div className="product-context-strip">
                  {activeChat.product.image && (
                    <img
                      src={activeChat.product.image}
                      alt={activeChat.product.name || 'Product'}
                      className="product-strip-img"
                    />
                  )}
                  <div className="product-strip-info">
                    <span className="product-strip-label">Chatting about</span>
                    <span className="product-strip-name">{activeChat.product.name || 'Listing'}</span>
                  </div>
                  {activeChat.product.price != null && (
                    <span className="product-strip-price">₦{Number(activeChat.product.price).toLocaleString()}</span>
                  )}
                </div>
              )}`;

doReplace(targetHeader, replacementHeader, 'Active chat header replacement');

// 9. Thread map & avatar
const targetThread = `              {/* Message History Thread */}
              <div className="chat-messages-thread" ref={chatThreadRef}>
                {activeChat.messages.map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const isMatch = chatSearchMatches[currentMatchIndex]?.msg.id === msg.id;

                  const currentDateLabel = formatDateDivider(msg);
                  const prevMsg = activeChat.messages[index - 1];
                  const prevDateLabel = prevMsg ? formatDateDivider(prevMsg) : null;
                  const showDateDivider = index === 0 || currentDateLabel !== prevDateLabel;

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDateDivider && (
                        <div className="date-divider">
                          <span>{currentDateLabel}</span>
                        </div>
                      )}

                      <div
                        id={\`msg-bubble-\${msg.id}\`}
                        className={\`message-bubble-row \${isMe ? 'row-me' : 'row-them'}\`}
                      >
                        {!isMe && renderContactAvatar(activeChat.contact.avatar, activeChat.contact.name, "msg-avatar-mini")}
                        <div className="msg-bubble-wrapper">
                          <div className={\`message-bubble \${isMe ? 'bubble-me' : 'bubble-them'} \${msg.isOffer ? 'bubble-offer' : ''} \${isMatch ? 'bubble-search-active' : ''}\`}>`;

const replacementThread = `              {/* Message History Thread */}
              <div className="chat-messages-thread" ref={chatThreadRef}>
                {(activeChat.messages || []).map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const isMatch = chatSearchMatches[currentMatchIndex]?.msg.id === msg.id;

                  const currentDateLabel = formatDateDivider(msg);
                  const prevMsg = (activeChat.messages || [])[index - 1];
                  const prevDateLabel = prevMsg ? formatDateDivider(prevMsg) : null;
                  const showDateDivider = index === 0 || currentDateLabel !== prevDateLabel;

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDateDivider && (
                        <div className="date-divider">
                          <span>{currentDateLabel}</span>
                        </div>
                      )}

                      <div
                        id={\`msg-bubble-\${msg.id}\`}
                        className={\`message-bubble-row \${isMe ? 'row-me' : 'row-them'}\`}
                      >
                        {!isMe && renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "msg-avatar-mini")}
                        <div className="msg-bubble-wrapper">
                          <div className={\`message-bubble \${isMe ? 'bubble-me' : 'bubble-them'} \${msg.isOffer ? 'bubble-offer' : ''} \${isMatch ? 'bubble-search-active' : ''}\`}>`;

doReplace(targetThread, replacementThread, 'Thread map replacement');

// 10. Empty state
const targetEmpty = `            {filteredConversations.length === 0 ? (
              <div className="empty-chats">
                <MessageSquareMore size={36} className="empty-chats-icon" />
                <p className="empty-chats-title">No messages found</p>
                <p className="empty-chats-sub">Try searching with a different keyword or tab filter.</p>
              </div>
            ) : (`;

const replacementEmpty = `            {isLoadingConvs ? (
              <div className="empty-chats">
                <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px', border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p className="empty-chats-title">Loading chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-chats">
                <MessageSquareMore size={36} className="empty-chats-icon" />
                <p className="empty-chats-title">No conversations yet</p>
                <p className="empty-chats-sub">When you contact a seller or a buyer messages you, chats appear here.</p>
                <NavLink to="/" className="browse-ads-btn">Browse Marketplace</NavLink>
              </div>
            ) : (`;

doReplace(targetEmpty, replacementEmpty, 'Empty state replacement');

// 11. Offer response buttons
const targetBubbleMeta = `                            <div className="message-meta">
                              <span className="msg-time">{msg.time}</span>
                              {isMe && (
                                <CheckCheck size={14} className={\`status-icon \${msg.status === 'read' ? 'status-read' : ''}\`} />
                              )}
                            </div>`;

const replacementBubbleMeta = `                            {/* Offer response buttons for recipient */}
                            {msg.isOffer && !isMe && msg.offerAmount && (
                              <div className="offer-response-row">
                                <button
                                  type="button"
                                  className="btn-offer-accept"
                                  onClick={() => handleOfferResponse(msg.offerAmount, true)}
                                >
                                  Accept (₦{Number(msg.offerAmount).toLocaleString()})
                                </button>
                                <button
                                  type="button"
                                  className="btn-offer-decline"
                                  onClick={() => handleOfferResponse(msg.offerAmount, false)}
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            <div className="message-meta">
                              <span className="msg-time">{msg.time}</span>
                              {isMe && (
                                <CheckCheck size={14} className={\`status-icon \${msg.status === 'read' ? 'status-read' : ''}\`} />
                              )}
                            </div>`;

doReplace(targetBubbleMeta, replacementBubbleMeta, 'Offer response buttons replacement');

// 12. Profile modal safe guards
const targetModal = `              <div className="profile-modal-avatar-container">
                {renderContactAvatar(activeChat.contact.avatar, activeChat.contact.name, "profile-large-avatar")}
                {activeChat.contact.isOnline && <span className="profile-online-badge" />}
              </div>
              <h3 className="profile-modal-name">{activeChat.contact.name}</h3>
              {activeChat.contact.verified && <span className="profile-verified-tag">✓ Verified Seller</span>}
              <p className="profile-modal-location">📍 {activeChat.contact.location}</p>
              <p className="profile-modal-phone">📞 {activeChat.contact.phone}</p>`;

const replacementModal = `              <div className="profile-modal-avatar-container">
                {renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "profile-large-avatar")}
                {activeChat?.contact?.isOnline && <span className="profile-online-badge" />}
              </div>
              <h3 className="profile-modal-name">{activeChat?.contact?.name || 'User'}</h3>
              {activeChat?.contact?.verified && <span className="profile-verified-tag">✓ Verified Seller</span>}
              <p className="profile-modal-location">📍 {activeChat?.contact?.location || 'Nigeria'}</p>
              <p className="profile-modal-phone">📞 {activeChat?.contact?.phone || '+234 800 000 0000'}</p>`;

doReplace(targetModal, replacementModal, 'Profile modal safe guards');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Finished updating Messages.jsx');
