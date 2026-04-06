import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./Dashboard.css";
import logo from "../../assets/inspiron-bg-white.png";

const Dashboard = ({ onLogout }: any) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ✅ NEW STATES
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [channelName, setChannelName] = useState("");

  const [mentionQuery, setMentionQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [channelUsers, setChannelUsers] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?._id;

  // ================= FETCH CHANNELS =================
  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:3000/channel/${userId}`)
      .then((res) => res.json())
      .then(setChannels);
  }, [userId]);

  // ================= FETCH USERS (MODAL) =================
  useEffect(() => {
    if (showModal) {
      fetch("http://localhost:3000/user/getAllUsers")
        .then((res) => res.json())
        .then((data) => setUsers(data.filter((u: any) => u._id !== userId)));
    }
  }, [showModal]);

  // ================= FETCH MESSAGES =================
  useEffect(() => {
    if (!selectedChannel) return;

    const token = localStorage.getItem("appToken");

    axios
      .get(`http://localhost:3000/message/${selectedChannel._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMessages(res.data.data));
  }, [selectedChannel]);

  // ================= WEBSOCKET =================
  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket("ws://localhost:3000/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "JOIN", userId }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "RECEIVE_MESSAGE") {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    return () => ws.close();
  }, [userId]);

  // ================= SELECT CHANNEL =================
  const handleChannelClick = (ch: any) => {
    setSelectedChannel(ch);

    const members = ch.members
      ?.filter((m: any) => m.userId._id !== userId)
      .map((m: any) => ({
        _id: m.userId._id,
        email: m.userId.email,
      }));

    setChannelUsers(members || []);
  };

  // ================= MENTION =================
  const handleChange = (e: any) => {
    const value = e.target.value;
    setInput(value);

    const lastWord = value.split(" ").pop();

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // ================= SEND =================
  const handleSend = async () => {
    if (!selectedChannel) return;

    let fileUrl = "";
    let fileType = "";
    let fileName = "";

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("channelId", selectedChannel._id);

      const token = localStorage.getItem("appToken");

      const res = await axios.post(
        "http://localhost:3000/message/upload",
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      fileUrl = res.data.fileUrl;
      fileType = res.data.fileType;
      fileName = res.data.fileName;
    }

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

  // ================= CREATE CHANNEL =================
  const createChannel = async () => {
    if (channelName.length < 3) {
      return;
    }
    const res = await fetch("http://localhost:3000/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: channelName,
        members: [...selectedUsers.map((id) => ({ userId: id })), { userId }],
      }),
    });

    const data = await res.json();
    setChannels((prev) => [...prev, data]);

    setShowModal(false);
    setSelectedUsers([]);
    setChannelName("");
  };

  const handleCancelChannel = () => {
    setShowModal(false);
  };

  const iconMap: Record<string, string> = {
    "HR Connect": "diversity_3",
    "Culture Connect": "favorite",
    "Finance Connect": "payments",
  };

  const iconFor = (name: string) => iconMap[name];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 dashboard-page">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        {/* LOGO */}
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="Inspiron Logo" className="w-30 h-10 rounded" />
        </div>

        {/* CHANNELS */}
        <div className="flex-1 overflow-y-auto space-y-2 fade-scroll">
          {channels.map((ch) => (
            <div
              key={ch._id}
              onClick={() => handleChannelClick(ch)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                selectedChannel?._id === ch._id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-green-500">
                {iconFor(ch.name)}
              </span>
              <span>{ch.name}</span>
            </div>
          ))}
        </div>

        {/* CREATE CHANNEL */}
        {user?.role === "Admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 bg-blue-500 text-white p-2 rounded"
          >
            + Create Channel
          </button>
        )}

        {/* USER */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
              {user.name?.[0]}
            </div>
            <div className="text-sm">{user.name}</div>
          </div>

          <button
            onClick={onLogout}
            className="mt-3 w-full bg-red-500 text-white p-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
          <h1 className="text-lg font-bold">
            {selectedChannel ? selectedChannel.name : "Select Channel"}
          </h1>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 fade-scroll bg-gray-50">
          {messages.map((msg, i) => {
            const isMe = msg.senderId._id === userId;

            return (
              <div
                key={i}
                className={`flex gap-3 ${isMe ? "justify-end" : ""}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {msg.senderId.name[0]}
                  </div>
                )}

                <div className={`max-w-xl ${isMe ? "text-right" : ""}`}>
                  <div className="text-xs text-gray-500">
                    {msg.senderId.name}
                  </div>

                  <div
                    className={`mt-1 p-3 rounded-2xl ${
                      isMe
                        ? "bg-green-500 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.text}

                    {msg.fileUrl && (
                      <div className="mt-2">
                        {msg.fileType === "image" && (
                          <img
                            src={`http://localhost:3000/${msg.fileUrl}`}
                            className="w-40 rounded cursor-pointer hover:scale-105 transition"
                            onClick={() =>
                              setPreviewImage(
                                `http://localhost:3000/${msg.fileUrl}`,
                              )
                            }
                          />
                        )}

                        {msg.fileType === "video" && (
                          <video
                            src={`http://localhost:3000/${msg.fileUrl}`}
                            controls
                            className="w-60 rounded"
                          />
                        )}

                        {msg.fileType === "pdf" && (
                          <a
                            href={`http://localhost:3000/${msg.fileUrl}`}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            📄 Open PDF
                          </a>
                        )}

                        {msg.fileType === "doc" && (
                          <a
                            href={`http://localhost:3000/${msg.fileUrl}`}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            📎 Download File
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <div className="p-6 border-t border-gray-200 relative bg-white">
          {/* MENTION */}
          {showSuggestions && (
            <div className="absolute bottom-24 left-6 bg-white border border-gray-300 rounded-lg w-64 shadow-lg z-10">
              {channelUsers
                .filter((u) =>
                  u.email.toLowerCase().includes(mentionQuery.toLowerCase()),
                )
                .map((u) => (
                  <div
                    key={u._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setInput((prev) => prev.replace(/@\w*$/, `@${u.email} `));
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

          {/* FILE PREVIEW */}
          {selectedFile && (
            <div className="mb-3 flex items-center gap-3 bg-gray-100 p-2 rounded-lg w-fit">
              <span
                className="text-red-500 cursor-pointer"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                ❌
              </span>

              {selectedFile.type.startsWith("image") && (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  className="w-16 h-16 object-cover rounded"
                />
              )}

              {selectedFile.type.startsWith("video") && (
                <video controls className="w-32 rounded">
                  <source src={URL.createObjectURL(selectedFile)} />
                </video>
              )}

              {!selectedFile.type.startsWith("image") &&
                !selectedFile.type.startsWith("video") && (
                  <span className="text-sm text-gray-600">
                    📄 {selectedFile.name}
                  </span>
                )}
            </div>
          )}

          {/* INPUT BOX */}
          <div className="bg-gray-100 rounded-2xl p-3 flex items-center gap-2">
            <input
              value={input}
              onChange={handleChange}
              placeholder="Type message... (@mention)"
              className="flex-1 bg-transparent outline-none text-gray-800 px-2"
            />

            <label className="material-symbols-outlined text-gray-500 cursor-pointer">
              add_circle
              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>

            <span className="material-symbols-outlined text-gray-500 cursor-pointer">
              mood
            </span>

            <button
              onClick={handleSend}
              className="bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-1"
            >
              Send
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-80 shadow-lg">
            <input
              placeholder="Channel name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full p-2 bg-gray-100 border border-gray-300 rounded"
            />

            <div className="user-list mt-2">
              {users.map((u) => (
                <label key={u._id} className="block text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mr-2"
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedUsers((prev) => [...prev, u._id]);
                      else
                        setSelectedUsers((prev) =>
                          prev.filter((id) => id !== u._id),
                        );
                    }}
                  />
                  {u.email}
                </label>
              ))}
            </div>

            <div className="mdoal-btn-container">
              <button
                onClick={createChannel}
                className="bg-green-500 text-white w-full mt-2 p-2 rounded"
              >
                Create
              </button>
              <button
                onClick={handleCancelChannel}
                className="bg-red-500 text-white w-full mt-2 p-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ✅ IMAGE FULL VIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          {/* ❌ CLOSE BUTTON */}
          <span className="absolute top-6 right-6 text-white text-2xl cursor-pointer">
            ✖
          </span>

          {/* IMAGE */}
          <img
            src={previewImage}
            className="max-h-[90%] max-w-[90%] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking image
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;