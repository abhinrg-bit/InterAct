import React, { useRef, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "@react-native-firebase/firestore";

GoogleSignin.configure({
  webClientId: "673422371077-1mru9ti9o0294ijk39kttlu6cs13884.apps.googleusercontent.com",
});
const auth = getAuth();
const db = getFirestore();

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderEmail?: string;
  createdAt?: any;
};

function makeChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [friendEmail, setFriendEmail] = useState("");
  const [friendUid, setFriendUid] = useState<string | null>(null);
  const [friendName, setFriendName] = useState("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatList, setChatList] = useState<any[]>([]);
  const flatListRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            uid: currentUser.uid,
            email: currentUser.email || "",
            name: currentUser.displayName || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

      const cleanEmail = (currentUser.email || "").trim().toLowerCase();

      if (cleanEmail) {
        await setDoc(
          doc(db, "emailIndex", cleanEmail),
          {
            uid: currentUser.uid,
          },
          { merge: true }
        );
      }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !friendUid) {
      setMessages([]);
      return;
    }

    const chatId = makeChatId(user.uid, friendUid);

    const messagesRef = collection(
      db,
      "chats",
      chatId,
      "messages"
    );

    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];

        snapshot.forEach((item: any) => {
          list.push({
            id: item.id,
            ...(item.data() as Omit<Message, "id">),
          });
        });

        setMessages(list);
      },
      (error) => {
        console.log("Message listener error:", error);
      }
    );

    return unsubscribe;
  }, [user, friendUid]);

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        return;
      }

      const idToken = response.data.idToken;

      if (!idToken) {
        throw new Error("Google ID token was not returned.");
      }

      const credential = GoogleAuthProvider.credential(idToken);

      await signInWithCredential(auth, credential);
    } catch (error: any) {
      setAuthError(error?.message || "Google Sign-In failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Required", "Email aur password enter karo.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password", "Password minimum 6 characters ka hona chahiye.");
      return;
    }

    try {
      setAuthLoading(true);

      if (mode === "signup") {
        if (!name.trim()) {
          Alert.alert("Name required", "Apna naam enter karo.");
          return;
        }

        const result = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        await updateProfile(result.user, {
          displayName: name.trim(),
        });

        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: cleanEmail,
          name: name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, "emailIndex", cleanEmail), {
        uid: result.user.uid,
      });

      Alert.alert("Success", "InterAct account create ho gaya.");
      } else {
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
      }
    } catch (error: any) {
      console.log(error);

      let msg = "Authentication failed.";

      if (error?.code === "auth/email-already-in-use") {
        msg = "Ye email already registered hai.";
      } else if (error?.code === "auth/invalid-email") {
        msg = "Email address invalid hai.";
      } else if (error?.code === "auth/invalid-credential") {
        msg = "Email ya password galat hai.";
      } else if (error?.code === "auth/weak-password") {
        msg = "Password bahut weak hai.";
      }

      Alert.alert("InterAct", msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const findFriend = async () => {
    const cleanEmail = friendEmail.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email required", "Please enter your friend's registered InterAct email.");
      return;
    }

    if (!user) return;

    try {
      setChatLoading(true);

      const usersRef = collection(db, "users");

      // Firestore doesn't support direct Auth-user lookup by email.
      // We keep a small email index when users sign up.
      const emailDoc = await getDoc(
        doc(db, "emailIndex", cleanEmail)
      );

      if (!emailDoc.exists()) {
        Alert.alert(
          "User not found",
          "Is email se InterAct account nahi mila."
        );
        return;
      }

      const data = emailDoc.data();

      if (!data?.uid) {
        Alert.alert("Error", "User profile incomplete hai.");
        return;
      }

      if (data.uid === user.uid) {
        Alert.alert("InterAct", "Apne aap ko chat nahi kar sakte.");
        return;
      }

      const profile = await getDoc(doc(db, "users", data.uid));

      const chatId = makeChatId(user.uid, data.uid);

      await setDoc(
        doc(db, "chats", chatId),
        {
          participants: [user.uid, data.uid],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setFriendUid(data.uid);
      setFriendName(
        profile.exists()
          ? profile.data()?.name || cleanEmail
          : cleanEmail
      );
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "User search failed.");
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setChatList([]);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const items = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          const otherUid = (data.participants || []).find(
            (uid: string) => uid !== user.uid
          );

          if (!otherUid) return null;

          const otherUserSnap = await getDoc(
            doc(db, "users", otherUid)
          );

          const otherUser = otherUserSnap.exists()
            ? otherUserSnap.data()
            : {};

          return {
            id: chatDoc.id,
            friendUid: otherUid,
            friendName: otherUser.name || otherUser.email || "InterAct User",
            friendEmail: otherUser.email || "",
            lastMessage: data.lastMessage || "",
            updatedAt: data.updatedAt || null,
          };
        })
      );

      setChatList(
        items
          .filter(Boolean)
          .sort((a: any, b: any) => {
            const aTime = a.updatedAt?.toMillis?.() || 0;
            const bTime = b.updatedAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
      );
    });

    return unsubscribe;
  }, [user]);

  const sendMessage = async () => {
    const text = message.trim();

    if (!text || !user || !friendUid) return;

    try {
      const chatId = makeChatId(user.uid, friendUid);

      await addDoc(
        collection(db, "chats", chatId, "messages"),
        {
          text,
          senderId: user.uid,
          senderEmail: user.email || "",
          createdAt: serverTimestamp(),
        }
      );

      await setDoc(
        doc(db, "chats", chatId),
        {
          updatedAt: serverTimestamp(),
          lastMessage: text,
        },
        { merge: true }
      );

      setMessage("");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Message send nahi hua.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setFriendUid(null);
    setFriendName("");
    setFriendEmail("");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.logo}>InterAct</Text>
        <Text style={styles.subtle}>Starting securely...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.authBox}>
          <Text style={styles.logo}>InterAct</Text>
          <Text style={styles.tagline}>
            Private communication, built for you.
          </Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAuth}
            disabled={authLoading}
          >
            <Text style={styles.primaryText}>
              {authLoading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </Text>
          </TouchableOpacity>

                <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={authLoading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

<TouchableOpacity
            onPress={() => setMode(mode === "login" ? "signup" : "login")}
          >
            <Text style={styles.switchText}>
              {mode === "login"
                ? "New to InterAct? Create account"
                : "Already have an account? Login"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.security}>
            🔒 Firebase authentication enabled
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!friendUid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>InterAct</Text>

          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.home}>
          <Text style={styles.welcome}>
            Welcome, {user.displayName || user.email}
          </Text>

          <Text style={styles.sectionTitle}>
            My Chats
          </Text>

          {chatList.length === 0 ? (
            <Text style={styles.empty}>
              No chats yet. Start your first private chat below.
            </Text>
          ) : (
            chatList.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatListItem}
                onPress={() => {
                  setFriendUid(chat.friendUid);
                  setFriendName(chat.friendName);
                  setFriendEmail(chat.friendEmail);
                }}
              >
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {(chat.friendName || "I").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.chatListText}>
                  <Text style={styles.chatListName}>
                    {chat.friendName}
                  </Text>

                  <Text style={styles.chatListLastMessage} numberOfLines={1}>
                    {chat.lastMessage || "No messages yet"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <Text style={styles.sectionTitle}>
            Start a private chat
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Friend's InterAct email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={friendEmail}
            onChangeText={setFriendEmail}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={findFriend}
            disabled={chatLoading}
          >
            <Text style={styles.primaryText}>
              {chatLoading ? "Searching..." : "Open Private Chat"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.help}>
            Both users must have InterAct accounts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => {
            setFriendUid(null);
            setFriendName("");
            setMessages([]);
          }}
        >
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.chatName}>{friendName}</Text>
          <Text style={styles.online}>Private chat</Text>
        </View>

        <Text style={styles.lock}>🔒</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }}
          renderItem={({ item }) => {
            const mine = item.senderId === user.uid;

            return (
              <View
                style={[
                  styles.messageBubble,
                  mine ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    mine && styles.myMessageText,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No messages yet. Send the first message.
            </Text>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Message..."
            placeholderTextColor="#777"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
  },

  center: {
    flex: 1,
    backgroundColor: "#0B1020",
    alignItems: "center",
    justifyContent: "center",
  },

  authBox: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  tagline: {
    color: "#9BA4B5",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 35,
  },

  input: {
    backgroundColor: "#171E31",
    borderWidth: 1,
    borderColor: "#2A3550",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    marginBottom: 14,
    fontSize: 16,
  },

  googleButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
  },

  primaryButton: {
    backgroundColor: "#4F7CFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  switchText: {
    color: "#7FA1FF",
    textAlign: "center",
    fontSize: 15,
  },

  security: {
    color: "#6F7B91",
    textAlign: "center",
    marginTop: 35,
  },

  subtle: {
    color: "#8C96AA",
    marginTop: 10,
  },

  header: {
    height: 70,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1D263B",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  logout: {
    color: "#FF7777",
    fontWeight: "600",
  },

  home: {
    padding: 20,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 35,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },

  help: {
    color: "#707B91",
    marginTop: 10,
    lineHeight: 21,
  },

  chatHeader: {
    minHeight: 70,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1D263B",
  },

  back: {
    color: "#FFFFFF",
    fontSize: 40,
    marginRight: 12,
  },

  chatName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  online: {
    color: "#61D68A",
    fontSize: 12,
    marginTop: 2,
  },

  lock: {
    fontSize: 20,
  },

  messages: {
    padding: 15,
    flexGrow: 1,
    justifyContent: "flex-end",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 4,
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4F7CFF",
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#1A2338",
  },

  messageText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  empty: {
    color: "#68748A",
    textAlign: "center",
    marginBottom: 20,
  },

  chatListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  chatAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  chatListText: {
    flex: 1,
  },

  chatListName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  chatListLastMessage: {
    marginTop: 3,
    fontSize: 14,
    color: "#6B7280",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 18,
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: "#1D263B",
  },

  messageInput: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: "#171E31",
    borderRadius: 20,
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 16,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F7CFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 23,
  },
});