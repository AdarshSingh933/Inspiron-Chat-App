import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import axios from "axios";
import "./Dashboard.css";
import logo from "../../assets/inspiron-bg-white.png";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";
const WS_URL =
  window.location.hostname === "localhost"
    ? "ws://localhost:3000/ws"
    : "wss://inspiron-chat-app.onrender.com/ws";
const MAX_SIDEBAR_THUMB_HEIGHT = 100;
const MIN_SIDEBAR_THUMB_HEIGHT = 48;

const DEFAULT_CHANNEL_MEMBER_EMAIL = "prerana.k@inspironlabs.com";

const getMentionLabel = (user: any) => user.name || user.email;

const getMentionTag = (user: any) => {
  if (user?.name && user?.email) {
    return `${user.name}- ${user.email}`;
  }

  return user?.name || user?.email || "";
};

const EMOJI_LIST = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
  "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😜", "🤪", "😝",
  "🤗", "🤔", "😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮",
  "🤐", "😯", "😪", "😫", "🥱", "😴", "😌", "😛", "😒", "😓",
  "😔", "😕", "🙃", "🫠", "🤑", "😲", "🙁", "😖", "😞", "😟",
  "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰",
  "😱", "🥵", "🥶", "😳", "🤪", "😵", "😡", "😠", "🤬", "😷",
  "👍", "👎", "👏", "🙌", "🙏", "👌", "✌️", "🤞", "🤝", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💯",
  "🔥", "⭐", "🌟", "✨", "🎉", "🎊", "✅", "❌", "⚠️", "🚀",
  "👀", "💀", "👻", "🎉", "🌸", "🌞", "🌙", "⚡", "💡", "📌",
];

const Dashboard = ({ onLogout, currentUser }: any) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
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
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [addableUsers, setAddableUsers] = useState<any[]>([]);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hasSidebarScrollbar, setHasSidebarScrollbar] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const sidebarThumbRef = useRef<HTMLDivElement | null>(null);
  const sidebarDragState = useRef({ startY: 0, startScrollTop: 0 });
  const sidebarThumbMetricsRef = useRef({ height: 0, top: 0 });
  const sidebarAnimationFrameRef = useRef<number | null>(null);
  const peoplePanelRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);
  const channelDraftsRef = useRef<
    Record<string, { input: string; mentions: string[]; selectedFile: File | null }>
  >({});
  const user = currentUser || {};
  const userId = user?._id;

  const paintSidebarThumb = (height: number, top: number) => {
    const thumbEl = sidebarThumbRef.current;

    if (!thumbEl) return;

    thumbEl.style.height = `${height}px`;
    thumbEl.style.transform = `translateY(${top}px)`;
  };

  const updateSidebarScrollbar = () => {
    const el = sidebarScrollRef.current;

    if (!el) return;

    const { clientHeight, scrollHeight, scrollTop } = el;

    if (scrollHeight <= clientHeight) {
      setHasSidebarScrollbar(false);
      return;
    }

    const rawThumbHeight = (clientHeight / scrollHeight) * clientHeight;
    const thumbHeight = Math.min(
      MAX_SIDEBAR_THUMB_HEIGHT,
      Math.max(MIN_SIDEBAR_THUMB_HEIGHT, rawThumbHeight),
    );
    const maxThumbTop = clientHeight - thumbHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbTop =
      maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

    sidebarThumbMetricsRef.current = {
      height: thumbHeight,
      top: thumbTop,
    };
    setHasSidebarScrollbar(true);

    if (sidebarAnimationFrameRef.current !== null) {
      cancelAnimationFrame(sidebarAnimationFrameRef.current);
    }

    sidebarAnimationFrameRef.current = requestAnimationFrame(() => {
      paintSidebarThumb(thumbHeight, thumbTop);
      sidebarAnimationFrameRef.current = null;
    });
  };

  useEffect(() => {
    const el = sidebarScrollRef.current;

    if (!el) return;

    updateSidebarScrollbar();

    const handleResize = () => updateSidebarScrollbar();

    el.addEventListener("scroll", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("scroll", handleResize);
      window.removeEventListener("resize", handleResize);

      if (sidebarAnimationFrameRef.current !== null) {
        cancelAnimationFrame(sidebarAnimationFrameRef.current);
      }
    };
  }, [channels.length]);

  useEffect(() => {
    updateSidebarScrollbar();
  }, [channels]);

  useEffect(() => {
    if (!hasSidebarScrollbar) return;

    paintSidebarThumb(
      sidebarThumbMetricsRef.current.height,
      sidebarThumbMetricsRef.current.top,
    );
  }, [hasSidebarScrollbar]);

  const handleSidebarThumbMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    const el = sidebarScrollRef.current;

    if (!el) return;

    sidebarDragState.current = {
      startY: e.clientY,
      startScrollTop: el.scrollTop,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scrollEl = sidebarScrollRef.current;

      if (!scrollEl) return;

      const deltaY = moveEvent.clientY - sidebarDragState.current.startY;
      const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
      const maxThumbTop =
        scrollEl.clientHeight - sidebarThumbMetricsRef.current.height;

      if (maxScrollTop <= 0 || maxThumbTop <= 0) return;

      scrollEl.scrollTop =
        sidebarDragState.current.startScrollTop +
        (deltaY / maxThumbTop) * maxScrollTop;
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSidebarTrackMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;

    const el = sidebarScrollRef.current;

    if (!el) return;

    const trackRect = e.currentTarget.getBoundingClientRect();
    const nextThumbTop = Math.min(
      Math.max(
        0,
        e.clientY - trackRect.top - sidebarThumbMetricsRef.current.height / 2,
      ),
      el.clientHeight - sidebarThumbMetricsRef.current.height,
    );
    const maxScrollTop = el.scrollHeight - el.clientHeight;
    const maxThumbTop = el.clientHeight - sidebarThumbMetricsRef.current.height;

    if (maxScrollTop <= 0 || maxThumbTop <= 0) return;

    el.scrollTop = (nextThumbTop / maxThumbTop) * maxScrollTop;
  };

  // ================= FETCH CHANNELS =================
  useEffect(() => {
    if (!userId) return;

    fetch(`${API_BASE_URL}/channel/${userId}`)
      .then((res) => res.json())
      .then(async (data) => {
        const list = Array.isArray(data) ? data : [];
        setChannels(list);

        if (list.length > 0 && !selectedChannelIdRef.current) {
          const firstChannel = list[0];
          selectedChannelIdRef.current = firstChannel._id;
          setSelectedChannel(firstChannel);

          try {
            await fetchChannelMembers(firstChannel._id);
          } catch (error) {
            console.error("Failed to fetch channel users:", error);
            applyChannelMembers([]);
          }
        }
      })
      .finally(() => setChannelsLoaded(true));
  }, [userId]);

  // ================= FETCH USERS (MODAL) =================
  useEffect(() => {
    if (showModal) {
      fetch(`${API_BASE_URL}/user/getAllUsers`)
        .then((res) => res.json())
        .then((data) =>
          setUsers(
            data.filter(
              (u: any) =>
                u._id !== userId &&
                u.email?.toLowerCase() !== DEFAULT_CHANNEL_MEMBER_EMAIL,
            ),
          ),
        );
    }
  }, [showModal]);

  // ================= FETCH MESSAGES =================
  useEffect(() => {
    if (!selectedChannel) return;

    const channelId = selectedChannel._id;
    selectedChannelIdRef.current = channelId;

    const token = localStorage.getItem("appToken");

    axios
      .get(`${API_BASE_URL}/message/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (selectedChannelIdRef.current === channelId) {
          setMessages(res.data.data || []);
        }
      });
  }, [selectedChannel]);

  // ================= WEBSOCKET =================
  useEffect(() => {
    if (!userId) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "JOIN", userId }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== "RECEIVE_MESSAGE") return;

      const messageChannelId = data.message?.channelId?.toString();
      const currentChannelId = selectedChannelIdRef.current?.toString();

      if (!messageChannelId || messageChannelId !== currentChannelId) return;

      setMessages((prev) => [...prev, data.message]);
    };

    return () => ws.close();
  }, [userId]);

  const applyChannelMembers = (members: any[] = []) => {
    setChannelMembers(members);
    setChannelUsers(members.filter((member: any) => member._id !== userId));
  };

  const fetchChannelMembers = async (channelId: string) => {
    const res = await fetch(`${API_BASE_URL}/user/getAllUsers/${channelId}`);
    const members = await res.json();
    applyChannelMembers(Array.isArray(members) ? members : []);
    return Array.isArray(members) ? members : [];
  };

  // ================= SELECT CHANNEL =================
  const handleChannelClick = async (ch: any) => {
    if (selectedChannel?._id === ch._id) return;

    if (selectedChannel?._id) {
      channelDraftsRef.current[selectedChannel._id] = {
        input,
        mentions,
        selectedFile,
      };
    }

    const nextDraft = channelDraftsRef.current[ch._id] || {
      input: "",
      mentions: [],
      selectedFile: null,
    };

    selectedChannelIdRef.current = ch._id;
    setSelectedChannel(ch);
    setMessages([]);
    setInput(nextDraft.input);
    setMentions(nextDraft.mentions);
    setSelectedFile(nextDraft.selectedFile);
    setShowSuggestions(false);
    setShowPeoplePanel(false);
    setShowAddPeople(false);
    setShowEmojiPicker(false);

    try {
      await fetchChannelMembers(ch._id);
    } catch (error) {
      console.error("Failed to fetch channel users:", error);
      applyChannelMembers([]);
    }
  };

  const handleTogglePeoplePanel = async () => {
    if (!selectedChannel) return;

    const nextOpen = !showPeoplePanel;
    setShowPeoplePanel(nextOpen);
    setShowAddPeople(false);

    if (nextOpen) {
      try {
        await fetchChannelMembers(selectedChannel._id);
      } catch (error) {
        console.error("Failed to fetch channel users:", error);
      }
    }
  };

  const handleShowAddPeople = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/getAllUsers`);
      const allUsers = await res.json();
      const memberIds = new Set(channelMembers.map((member) => member._id));

      setAddableUsers(
        (allUsers || []).filter((candidate: any) => !memberIds.has(candidate._id)),
      );
      setShowAddPeople(true);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setAddableUsers([]);
      setShowAddPeople(true);
    }
  };

  const handleAddUserToChannel = async (memberId: string) => {
    if (!selectedChannel) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/channel/${selectedChannel._id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: memberId }),
        },
      );
      const members = await res.json();

      if (!Array.isArray(members)) return;

      applyChannelMembers(members);
      setAddableUsers((prev) => prev.filter((candidate) => candidate._id !== memberId));
    } catch (error) {
      console.error("Failed to add user to channel:", error);
    }
  };

  useEffect(() => {
    if (!showPeoplePanel) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        peoplePanelRef.current &&
        !peoplePanelRef.current.contains(event.target as Node)
      ) {
        setShowPeoplePanel(false);
        setShowAddPeople(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);

    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showPeoplePanel]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);

    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // ================= MENTION =================
  const handleChange = (e: any) => {
    const value = e.target.value;
    setInput(value);

    const lastWord = value.split(" ").pop() || "";

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  // ================= SEND =================

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
        `${API_BASE_URL}/message/upload`,
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

    if (selectedChannel?._id) {
      channelDraftsRef.current[selectedChannel._id] = {
        input: "",
        mentions: [],
        selectedFile: null,
      };
    }
  };

  // ================= CREATE CHANNEL =================
  const createChannel = async () => {
    if (channelName.length < 3) {
      return;
    }
    const res = await fetch(`${API_BASE_URL}/channel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: channelName,
        createdBy: userId,
        members: [...selectedUsers.map((id) => ({ userId: id })), { userId }],
      }),
    });

    const data = await res.json();
    setChannels((prev) => [...prev, data]);
    await handleChannelClick(data);

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
    <div className="flex h-screen w-screen bg-gray-100 text-gray-800 dashboard-page">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        {/* LOGO */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200">
          <img src={logo} alt="Inspiron Logo" className="w-30 h-10 rounded" />
        </div>

        {/* CHANNELS */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={sidebarScrollRef}
            className="h-full overflow-y-auto space-y-2 pr-6 sidebar-scroll"
          >
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

          {hasSidebarScrollbar && (
            <div
              className="custom-sidebar-scrollbar"
              onMouseDown={handleSidebarTrackMouseDown}
            >
              <div
                ref={sidebarThumbRef}
                className="custom-sidebar-scrollbar-thumb"
                onMouseDown={handleSidebarThumbMouseDown}
              />
            </div>
          )}
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
      <div className="flex-1 min-w-0 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center px-[30px] py-4 border-b border-gray-200 bg-white relative">
          <h1 className="text-lg font-bold">
            {selectedChannel
              ? selectedChannel.name
              : channelsLoaded
                ? "No Channel"
                : "Select Channel"}
          </h1>

          {selectedChannel && (
            <div className="relative" ref={peoplePanelRef}>
              <button
                onClick={handleTogglePeoplePanel}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[22px]">group</span>
                <span className="text-sm font-medium">{channelMembers.length}</span>
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>

              {showPeoplePanel && (
                <div className="people-panel">
                  <div className="people-panel-title">
                    People ({channelMembers.length})
                  </div>

                  <div className="people-panel-list">
                    {channelMembers.map((member) => (
                      <div key={member._id} className="people-panel-item">
                        <div className="people-panel-avatar">
                          {(member.name || member.email || "?")[0]}
                        </div>
                        <div>
                          <div className="people-panel-name">
                            {member.name || member.email}
                          </div>
                          {member._id === userId && (
                            <div className="people-panel-you">You</div>
                          )}
                          {member.role === "Admin" && member._id !== userId && (
                            <div className="people-panel-you">Admin</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="people-panel-divider" />

                  {user?.role === "Admin" && (
                    <button
                      className="people-panel-action"
                      onClick={handleShowAddPeople}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        person_add
                      </span>
                      Add people
                    </button>
                  )}

                  {showAddPeople && (
                    <div className="people-panel-add-list">
                      {addableUsers.length === 0 ? (
                        <div className="people-panel-empty">No users to add</div>
                      ) : (
                        addableUsers.map((candidate) => (
                          <div key={candidate._id} className="people-panel-add-item">
                            <div>
                              <div className="people-panel-name">
                                {candidate.name || candidate.email}
                              </div>
                              <div className="people-panel-email">
                                {candidate.email}
                              </div>
                            </div>
                            <button
                              className="people-panel-add-btn"
                              onClick={() => handleAddUserToChannel(candidate._id)}
                            >
                              Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MESSAGES */}
        {selectedChannel ? (
        <div className="flex-1 min-w-0 overflow-y-auto pt-6 pb-6 pl-[30px] pr-[30px] space-y-6 message-scroll bg-gray-50">
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

                <div className={`max-w-xl break-words ${isMe ? "text-right" : ""}`}>
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
                            src={`${API_BASE_URL}/${msg.fileUrl}`}
                            className="w-40 rounded cursor-pointer hover:scale-105 transition"
                            onClick={() =>
                              setPreviewImage(
                                `${API_BASE_URL}/${msg.fileUrl}`,
                              )
                            }
                          />
                        )}

                        {msg.fileType === "video" && (
                          <video
                            src={`${API_BASE_URL}/${msg.fileUrl}`}
                            controls
                            className="w-60 rounded"
                          />
                        )}

                        {msg.fileType === "pdf" && (
                          <a
                            href={`${API_BASE_URL}/${msg.fileUrl}`}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            📄 Open PDF
                          </a>
                        )}

                        {msg.fileType === "doc" && (
                          <a
                            href={`${API_BASE_URL}/${msg.fileUrl}`}
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
        ) : (
          <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-50 px-[30px]">
            {channelsLoaded && (
              <div className="no-channel-message">
                {user?.role === "Admin" ? (
                  <p>
                    You are not part of any channel yet. Create a channel to get started.
                  </p>
                ) : (
                  <p>
                    You are not part of any channel and you don't have permission to
                    create a channel. Please connect to the admin for further assistance.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* INPUT */}
        {selectedChannel && (
        <div className="px-[30px] py-6 border-t border-gray-200 relative bg-white">
          {/* MENTION */}
          {showSuggestions && (
            <div className="absolute bottom-24 left-[30px] bg-white border border-gray-300 rounded-lg min-w-[320px] max-w-[420px] shadow-lg z-10">
              {channelUsers
                .filter((u) =>
                  `${u.name || ""} ${u.email}`
                    .toLowerCase()
                    .includes(mentionQuery.toLowerCase()),
                )
                .map((u) => (
                  <div
                    key={u._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setInput((prev) =>
                        prev.replace(/@[^\s]*$/, `@${getMentionTag(u)} `),
                      );
                      setMentions((prev) =>
                        prev.includes(u._id) ? prev : [...prev, u._id],
                      );
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="font-medium text-gray-800">
                      {getMentionLabel(u)}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
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

            <div className="relative" ref={emojiPickerRef}>
              <span
                className="material-symbols-outlined text-gray-500 cursor-pointer emoji-trigger"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowSuggestions(false);
                }}
              >
                mood
              </span>

              {showEmojiPicker && (
                <div className="emoji-picker">
                  <div className="emoji-picker-header">Emoji</div>
                  <input
                    value={emojiQuery}
                    onChange={(e) => setEmojiQuery(e.target.value)}
                    placeholder="Find something fun"
                    className="emoji-picker-search"
                  />
                  <div className="emoji-picker-grid">
                    {EMOJI_LIST.filter((emoji) =>
                      emojiQuery ? emoji.includes(emojiQuery) : true,
                    ).map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        type="button"
                        className="emoji-picker-item"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              className="bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-1"
            >
              Send
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-[420px] max-w-[90vw] shadow-lg">
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
