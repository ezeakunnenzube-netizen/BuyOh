import fs from 'fs';

const filePath = 'src/views/ProductDetails.jsx';
let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add chatService imports
const importTarget = `import { isConditionApplicable, shouldShowConditionBadge } from '../utils/productUtils';`;
const importReplacement = `import { isConditionApplicable, shouldShowConditionBadge } from '../utils/productUtils';
import { getOrCreateConversation, sendMessage as sendCloudMessage } from '../services/chatService';`;

if (code.includes(importTarget)) {
  code = code.replace(importTarget, importReplacement);
  console.log('Added chatService imports to ProductDetails.jsx');
}

// 2. Update handleMakeOffer
const offerTarget = `  const handleMakeOffer = (e) => {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    if (!offerPrice) return;
    try {
      const messagesKey = 'buyoh_messages_v1';
      let chats = JSON.parse(localStorage.getItem(messagesKey)) || [];
      let chat = chats.find(c => c.productId === product.id);
      const newMsg = {
        id: \`msg-\${Date.now()}\`,
        sender: 'me',
        text: \`Hello! I would like to make an offer of \${formatPrice(offerPrice)} for your "\${product.name}". Is it negotiable?\`,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      if (chat) {
        chat.messages.push(newMsg);
      } else {
        chat = {
          id: \`chat-\${Date.now()}\`,
          sellerName: "PHONEMART",
          sellerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          productImage: product.image,
          messages: [newMsg],
          isMuted: false,
          unreadCount: 0
        };
        chats.push(chat);
      }
      localStorage.setItem(messagesKey, JSON.stringify(chats));
      setShowOfferModal(false);
      showToast('Offer sent! Redirecting to chat...');
      setTimeout(() => navigate(\`/messages?productId=\${product.id}\`), 1200);
    } catch (err) { console.error(err); }
  };`;

const offerReplacement = `  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    if (!offerPrice) return;
    if (isUserSeller) {
      showToast('You cannot make an offer on your own listing');
      setShowOfferModal(false);
      return;
    }

    try {
      showToast('Sending your offer to seller...');
      const targetSellerId = product.sellerId || product.userId || 'platform-seller';
      const convRes = await getOrCreateConversation({
        user,
        sellerId: targetSellerId,
        productId: product.id,
        productDetails: product
      });

      if (convRes.isSelf) {
        showToast('You cannot make an offer on your own listing');
        setShowOfferModal(false);
        return;
      }

      await sendCloudMessage({
        conversationId: convRes.conversationId,
        senderId: user.id,
        recipientId: targetSellerId,
        text: \`🏷️ Make an Offer: ₦\${Number(offerPrice).toLocaleString('en-NG')}\`,
        isOffer: true,
        offerAmount: Number(offerPrice),
        productInfo: product
      });

      setShowOfferModal(false);
      showToast('Offer sent! Opening conversation...');
      setTimeout(() => {
        navigate(\`/messages?chatId=\${convRes.conversationId}&productId=\${product.id}\`);
      }, 900);
    } catch (err) {
      console.error(err);
      setShowOfferModal(false);
      setTimeout(() => navigate(\`/messages?productId=\${product.id}\`), 800);
    }
  };`;

if (code.includes(offerTarget)) {
  code = code.replace(offerTarget, offerReplacement);
  console.log('Updated handleMakeOffer in ProductDetails.jsx');
}

// 3. Update handleRequestCallbackSubmit
const callbackTarget = `  const handleRequestCallbackSubmit = (e) => {
    e.preventDefault();
    if (!callbackPhone.trim()) {
      showToast('Please enter your phone number');
      return;
    }
    try {
      const notifications = JSON.parse(localStorage.getItem('buyoh_notifications_v1')) || [];
      const newNotif = {
        id: \`notif-\${Date.now()}\`,
        title: '📞 Callback Request',
        message: \`A buyer requested a callback for "\${product.name}". Phone: \${callbackPhone} (\${callbackTime}). \${callbackNote ? \`Note: \${callbackNote}\` : ''}\`,
        time: 'Just now',
        unread: true,
        type: 'callback'
      };
      notifications.unshift(newNotif);
      localStorage.setItem('buyoh_notifications_v1', JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));
    } catch (err) {
      console.error(err);
    }
    setShowCallbackModal(false);
    showToast('Callback request sent! Seller has been notified.');
  };`;

const callbackReplacement = `  const handleRequestCallbackSubmit = async (e) => {
    e.preventDefault();
    if (!callbackPhone.trim()) {
      showToast('Please enter your phone number');
      return;
    }

    try {
      const targetSellerId = product.sellerId || product.userId || 'platform-seller';
      if (user && !isUserSeller) {
        const convRes = await getOrCreateConversation({
          user,
          sellerId: targetSellerId,
          productId: product.id,
          productDetails: product
        });

        await sendCloudMessage({
          conversationId: convRes.conversationId,
          senderId: user.id,
          recipientId: targetSellerId,
          text: \`📞 Callback Request: Please call me back at \${callbackPhone} (Preferred time: \${callbackTime}). \${callbackNote ? \`Note: \${callbackNote}\` : ''}\`,
          productInfo: product
        });
      }

      const notifications = JSON.parse(localStorage.getItem('buyoh_notifications_v1')) || [];
      const newNotif = {
        id: \`notif-\${Date.now()}\`,
        title: '📞 Callback Request',
        message: \`A buyer requested a callback for "\${product.name}". Phone: \${callbackPhone} (\${callbackTime}). \${callbackNote ? \`Note: \${callbackNote}\` : ''}\`,
        time: 'Just now',
        unread: true,
        type: 'callback'
      };
      notifications.unshift(newNotif);
      localStorage.setItem('buyoh_notifications_v1', JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));
    } catch (err) {
      console.error(err);
    }
    setShowCallbackModal(false);
    showToast('Callback request sent! Seller has been notified.');
  };`;

if (code.includes(callbackTarget)) {
  code = code.replace(callbackTarget, callbackReplacement);
  console.log('Updated handleRequestCallbackSubmit in ProductDetails.jsx');
}

// 4. Update Start chat link to include sellerId
const chatLinkTarget = `to={\`/messages?productId=\${product.id}&prodName=\${encodeURIComponent(product.name)}&prodPrice=\${product.price}&prodImg=\${encodeURIComponent(product.image)}\`}`;
const chatLinkReplacement = `to={\`/messages?productId=\${product.id}&sellerId=\${product.sellerId || product.userId || ''}&seller=\${encodeURIComponent(product.sellerName || '')}&prodName=\${encodeURIComponent(product.name)}&prodPrice=\${product.price}&prodImg=\${encodeURIComponent(product.image)}\`}`;

if (code.includes(chatLinkTarget)) {
  code = code.replace(chatLinkTarget, chatLinkReplacement);
  console.log('Updated start chat link in ProductDetails.jsx');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('ProductDetails.jsx finished.');
