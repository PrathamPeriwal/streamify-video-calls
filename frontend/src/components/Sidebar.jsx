import { Link, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellIcon, HomeIcon, ShipWheelIcon, MessageCircleIcon } from "lucide-react";
import { StreamChat } from "stream-chat";

import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken, getUserFriends } from "../lib/api";
import { handleAvatarError } from "../lib/utils";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;

  const [unreadCounts, setUnreadCounts] = useState({});
  const [chatClient, setChatClient] = useState(null);

  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const friends = friendsData || [];

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Connect to Stream Chat on desktop to get unread counts per friend
  useEffect(() => {
    let clientRef = null;

    const initStreamChat = async () => {
      if (!tokenData?.token || !authUser || !friends.length) return;

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);

        if (!client.userID) {
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        clientRef = client;
        setChatClient(client);

        const counts = {};
        for (const friend of friends) {
          const channelId = [authUser._id, friend._id].sort().join("-");
          try {
            const channel = client.channel("messaging", channelId);
            await channel.watch();
            const unread = channel.state.unreadCount || 0;
            if (unread > 0) counts[friend._id] = unread;
          } catch (err) {
            if (err.code === 17) {
              // user not allowed / not member yet; skip silently
              continue;
            }
            console.log(`Could not watch channel ${channelId}`, err);
          }
        }

        setUnreadCounts(counts);
      } catch (error) {
        console.error("Error initializing Stream Chat in sidebar:", error);
      }
    };

    initStreamChat();

    return () => {
      if (clientRef) clientRef.disconnectUser().catch(console.error);
    };
  }, [tokenData, authUser, friends]);

  // Live updates for new messages
  useEffect(() => {
    if (!chatClient || !authUser) return;

    const handleNewMessage = (event) => {
      if (event.user.id !== authUser._id) {
        const senderId = event.user.id;
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    chatClient.on("message.new", handleNewMessage);

    return () => {
      chatClient.off("message.new", handleNewMessage);
    };
  }, [chatClient, authUser]);

  return (
    <aside className="w-72 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/" className="flex items-center gap-2.5">
          <ShipWheelIcon className="size-9 text-primary" />
          <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
            Streamify
          </span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <nav className="p-4 space-y-1">
          <Link
            to="/"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath === "/" ? "btn-active" : ""
            }`}
          >
            <HomeIcon className="size-5 text-base-content opacity-70" />
            <span>Home</span>
          </Link>

          <Link
            to="/notifications"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath === "/notifications" ? "btn-active" : ""
            }`}
          >
            <BellIcon className="size-5 text-base-content opacity-70" />
            <span>Notifications</span>
          </Link>
        </nav>

        <div className="px-4 pb-2 pt-1 text-xs uppercase tracking-wide text-base-content/70">
          Friends
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {loadingFriends ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-base-content/60 px-2">No friends yet</p>
          ) : (
            friends.map((friend) => {
              const unread = unreadCounts[friend._id] || 0;
              return (
                <Link
                  key={friend._id}
                  to={`/chat/${friend._id}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-300 transition ${
                    currentPath === `/chat/${friend._id}` ? "bg-base-300" : ""
                  }`}
                >
                  <div className="avatar">
                    <div className="w-10 rounded-full">
                      <img src={friend.profilePic} alt={friend.fullName} loading="lazy" onError={handleAvatarError} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{friend.fullName}</p>
                    <p className="text-xs text-base-content/60 truncate">{friend.learningLanguage}</p>
                  </div>
                  {unread > 0 && (
                    <span className="badge badge-error badge-sm gap-1">
                      <MessageCircleIcon className="size-3" />
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" loading="lazy" onError={handleAvatarError} />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{authUser?.fullName}</p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
