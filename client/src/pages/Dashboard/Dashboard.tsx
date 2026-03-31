import { useEffect, useRef, useState } from "react";
import "./Dashboard.css";
import axios from "axios";

interface Channel {
  _id: string;
  name: string;
}

interface Message {
  senderId: {
    _id: string;
    name: string;
    email: string;
  };
  text: string;
  channelId: string;
  mentions: string[];
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

const Dashboard = ({ username, onLogout }: any) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [channelName, setChannelName] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [selectedChannelUsers, setSelectedChannelUsers] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  console.log("selectedUsers", selectedUsers);

  console.log("channels", channels);

  const wsRef = useRef<WebSocket | null>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  console.log("user", user);
  const userId = user?._id;
  console.log("user", user, userId);

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:3000/channel/${userId}`)
      .then((res) => res.json())
      .then((data) => setChannels(data))
      .catch((err) => console.error("Error fetching channels:", err));
  }, [userId]);

  useEffect(() => {
    if (showModal) {
      fetch("http://localhost:3000/user/getAllUsers")
        .then((res) => res.json())
        .then((data) => {
          const filteredUsers = data.filter((u: any) => u._id !== userId);
          setUsers(filteredUsers);
        })
        .catch((err) => console.error("Error fetching users:", err));
    }
  }, [showModal]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChannel?._id) return;

      try {
        const token = localStorage.getItem("appToken"); // if using auth

        const res = await axios.get(
          `http://localhost:3000/message/${selectedChannel._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setMessages(res.data.data); // ✅ load old messages
      } catch (err) {
        console.error("❌ Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedChannel]);

  useEffect(() => {
    if (!userId) return;
    const ws = new WebSocket("ws://localhost:3000/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🟢 WS Connected");
      ws.send(JSON.stringify({ type: "JOIN", userId }));
    };

    ws.onclose = () => {
      console.log("🔴 WS Closed");
    };

    ws.onerror = (err) => {
      console.error("❌ WS Error:", err);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "RECEIVE_MESSAGE") {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    return () => ws.close();
  }, [userId]);

  // ✅ Send message
  const handleSend = async () => {
    if (!selectedChannel) return;

    let fileUrl = "";
    let fileType = "";
    let fileName = "";

    // ✅ Step 1: Upload file (if exists)
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("channelId", selectedChannel._id); // ✅ FIX
      // ❌ DO NOT send senderId (already in JWT)

      const token = localStorage.getItem("appToken");

      const res = await axios.post(
        "http://localhost:3000/message/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // ⚠️ FIX: your backend returns { data: message }
      fileUrl = res.data.fileUrl;
      fileType = res.data.fileType;
      fileName = res.data.fileName;
    }

    // ✅ Step 2: Send via WebSocket
    wsRef.current?.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        senderId: userId,
        channelId: selectedChannel._id,
        text: input,
        mentions,
        fileUrl,
        fileType,
        fileName,
      }),
    );

    setInput("");
    setMentions([]);
    setSelectedFile(null);
  };

  // ✅ Create Channel
  const createChannel = async () => {
    if (!channelName.trim()) {
      alert("Channel name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      alert("Select at least one user");
      return;
    }

    const res = await fetch("http://localhost:3000/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: channelName,
        members: [
          ...selectedUsers.map((id) => ({ userId: id, role: "member" })),
          { userId, role: "admin" }, // creator = admin
        ], // include self
      }),
    });

    const data = await res.json();

    setChannels((prev) => [...prev, data]);

    // reset modal
    setShowModal(false);
    setSelectedUsers([]);
    setChannelName("");
  };

  const handleChange = (e: any) => {
    const value = e.target.value;
    setInput(value);

    const lastWord = value.split(" ").pop();

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.substring(1));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleChannelClick = (ch: any) => {
    setSelectedChannel(ch);
    const filterUser = ch.members
      .filter((member: any) => member.userId._id !== userId)
      .map((member: any) => ({
        _id: member.userId._id,
        email: member.userId.email,
      }));
    setSelectedChannelUsers(filterUser);
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="user-name-container">
          <h2>{user.name}</h2>
          <h3>Chat</h3>
        </div>
        <div className="channel-list">
          {channels?.map((ch) => (
            <div
              key={ch._id}
              className="user"
              onClick={() => handleChannelClick(ch)}
            >
              # {ch.name}
            </div>
          ))}
        </div>
        <div className="logout-btn-container">
          {user?.role === "Admin" && <button onClick={() => setShowModal(true)}>➕ Create Channel</button>}

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedChannel ? (
          <>
            <div className="chat-header">💬 {selectedChannel.name}</div>

            <div className="chat-messages">
              {messages.map((msg: any, i) => (
                <div
                  key={i}
                  className={`message ${
                    msg.senderId._id === userId ? "sent" : "received"
                  }`}
                >
                  {/* 👇 Username */}
                  <div className="sender-name">{msg.senderId.name}</div>

                  {/* 👇 Message */}
                  <div>{msg.text}</div>
                  {msg.fileUrl && (
                    <div>
                      {/* 🖼 Image */}
                      {msg.fileType === "image" && (
                        <img
                          src={`http://localhost:3000/${msg.fileUrl}`}
                          width="200"
                        />
                      )}

                      {/* 🎥 Video */}
                      {msg.fileType === "video" && (
                        <video
                          src={`http://localhost:3000/${msg.fileUrl}`}
                          controls
                          width="250"
                        />
                      )}

                      {/* 📄 PDF */}
                      {msg.fileType === "pdf" && (
                        <a
                          href={`http://localhost:3000/${msg.fileUrl}`}
                          target="_blank"
                        >
                          📄 Open PDF
                        </a>
                      )}

                      {/* 📎 Other Docs */}
                      {msg.fileType === "doc" && (
                        <a
                          href={`http://localhost:3000/${msg.fileUrl}`}
                          target="_blank"
                        >
                          📎 Download File
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="chat-input">
              {/* 🔥 Mention Suggestions */}
              {showSuggestions && (
                <div className="mention-box">
                  {selectedChannelUsers
                    .filter((u) =>
                      u.email
                        .toLowerCase()
                        .includes(mentionQuery.toLowerCase()),
                    )
                    .map((u) => (
                      <div
                        key={u._id}
                        className="mention-item"
                        onClick={() => {
                          setInput((prev) =>
                            prev.replace(/@\w*$/, `@${u.email} `),
                          );
                          setMentions((prev) =>
                            prev.includes(u._id) ? prev : [...prev, u._id],
                          );
                          setShowSuggestions(false);
                        }}
                      >
                        {u.email}
                      </div>
                    ))}
                </div>
              )}

              {/* ✅ Input */}

              <div className="chat-input-container">
                {/* ✍️ Text Input */}
                {selectedFile && (
                  <div className="file-preview">
                    {/* ❌ Remove button */}
                    <span
                      className="remove-file"
                      onClick={() => setSelectedFile(null)}
                    >
                      ❌
                    </span>

                    {/* 📸 Image preview */}
                    {selectedFile.type.startsWith("image") && (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="preview"
                        className="preview-img"
                      />
                    )}

                    {/* 🎥 Video preview */}
                    {selectedFile.type.startsWith("video") && (
                      <video
                        src={URL.createObjectURL(selectedFile)}
                        controls
                        className="preview-video"
                      />
                    )}

                    {/* 📄 Other files */}
                    {!selectedFile.type.startsWith("image") &&
                      !selectedFile.type.startsWith("video") && (
                        <div className="preview-doc">
                          📄 {selectedFile.name}
                        </div>
                      )}
                  </div>
                )}
                <div className="input-box">
                  <input
                    value={input}
                    onChange={handleChange}
                    placeholder="Type message... (@mention)"
                    className="text-input"
                  />
                  <label className="file-btn">
                    📎
                    <input
                      type="file"
                      hidden
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                  </label>

                  {/* 🚀 Send */}
                  <button onClick={handleSend}>Send</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-chat">Select a channel</div>
        )}
      </div>

      {/* Modal for creating channel */}
      {showModal && (
        <div className="modal">
          <h3>Create Channel</h3>

          {/* ✅ Channel Name Input */}
          <input
            type="text"
            placeholder="Enter channel name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="channel-input"
          />

          <h4>Select Users</h4>

          <div className="user-list">
            {users.map((u) => (
              <label key={u._id} className="user-row">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers((prev) => [...prev, u._id]);
                    } else {
                      setSelectedUsers((prev) =>
                        prev.filter((id) => id !== u._id),
                      );
                    }
                  }}
                />
                {u.email}
              </label>
            ))}
          </div>

          <button onClick={createChannel}>Create Channel</button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
