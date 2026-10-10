import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
  getStreamToken,
} from "../lib/api";
import { Link } from "react-router";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, UsersIcon, SearchIcon } from "lucide-react";

import { capitialize, handleAvatarError } from "../lib/utils";

import FriendCard, { getLanguageFlag } from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import { StreamChat } from "stream-chat";
import useAuthUser from "../hooks/useAuthUser";
import { LANGUAGES } from "../constants";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const HomePage = () => {
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [chatClient, setChatClient] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { authUser } = useAuthUser();

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const { mutate: sendRequestMutation, isPending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
  });

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient._id);
      });
      setOutgoingRequestsIds(outgoingIds);
    }
  }, [outgoingFriendReqs]);

  // Initialize Stream Chat to get unread counts
  useEffect(() => {
    const initStreamChat = async () => {
      // On desktop, the friends list lives in the sidebar; skip setting up here to avoid duplicate connections.
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      if (isDesktop) return;
      if (!tokenData?.token || !authUser || !friends.length) return;

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);

        // Check if already connected
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

        setChatClient(client);

        // Get unread counts for each friend
        const counts = {};
        for (const friend of friends) {
          const channelId = [authUser._id, friend._id].sort().join("-");
          try {
            const channel = client.channel("messaging", channelId);
            await channel.watch();
            const state = channel.state;
            const unreadCount = state.unreadCount || 0;
            if (unreadCount > 0) {
              counts[friend._id] = unreadCount;
            }
          } catch (error) {
            if (error.code === 17) {
              // permission / not member yet; skip silently
              continue;
            }
            console.log(`Could not fetch channel for ${friend._id}`, error);
          }
        }
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Error initializing Stream Chat:", error);
      }
    };

    initStreamChat();

    // Cleanup on unmount
    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error);
      }
    };
  }, [tokenData, authUser, friends]);

  // Listen for new messages to update unread counts
  useEffect(() => {
    if (!chatClient) return;

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

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredUsers = (recommendedUsers || []).filter((user) => {
    const nameMatch = normalizedSearch
      ? user.fullName?.toLowerCase().includes(normalizedSearch)
      : false;
    const languageMatch = selectedLanguage
      ? user.nativeLanguage?.toLowerCase() === selectedLanguage.toLowerCase()
      : true;

    // Show if name matches (search override) OR language matches filter
    return nameMatch || languageMatch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-10">
        {/* Friends section visible on mobile/tablet; hidden on desktop where sidebar shows friends */}
        <div className="lg:hidden space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Friends</h2>
            <Link to="/notifications" className="btn btn-outline btn-sm">
              <UsersIcon className="mr-2 size-4" />
              Friend Requests
            </Link>
          </div>

          {loadingFriends ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : friends.length === 0 ? (
            <NoFriendsFound />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {friends.map((friend) => (
                <FriendCard
                  key={friend._id}
                  friend={friend}
                  unreadCount={unreadCounts[friend._id] || 0}
                />
              ))}
            </div>
          )}
        </div>

        <section id="meet-new-learners">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Meet New Learners</h2>
                  <p className="opacity-70">
                    Discover perfect language exchange partners based on your profile
                  </p>
                </div>

                {/* Filters */}
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                  <div className="form-control w-full sm:w-56">
                    <label className="label">
                      <span className="label-text">Show natives of</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      <option value="">All languages</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang.toLowerCase()}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control w-full sm:w-64">
                    <label className="label">
                      <span className="label-text">Search by name</span>
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                      <SearchIcon className="size-4 opacity-60" />
                      <input
                        type="text"
                        className="grow"
                        placeholder="Search learners..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="card bg-base-200 p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">No recommendations available</h3>
              <p className="text-base-content opacity-70">Try adjusting the language filter or search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => {
                const hasRequestBeenSent = outgoingRequestsIds.has(user._id);

                return (
                  <div
                    key={user._id}
                    className="card bg-base-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="card-body p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar size-16 rounded-full">
                          <img src={user.profilePic} alt={user.fullName} loading="lazy" onError={handleAvatarError} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg">{user.fullName}</h3>
                          {user.location && (
                            <div className="flex items-center text-xs opacity-70 mt-1">
                              <MapPinIcon className="size-3 mr-1" />
                              {user.location}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Languages with flags */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="badge badge-secondary">
                          {getLanguageFlag(user.nativeLanguage)}
                          Native: {capitialize(user.nativeLanguage)}
                        </span>
                        <span className="badge badge-outline">
                          {getLanguageFlag(user.learningLanguage)}
                          Learning: {capitialize(user.learningLanguage)}
                        </span>
                      </div>

                      {user.bio && <p className="text-sm opacity-70">{user.bio}</p>}

                      {/* Action button */}
                      <button
                        className={`btn w-full mt-2 ${
                          hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                        } `}
                        onClick={() => sendRequestMutation(user._id)}
                        disabled={hasRequestBeenSent || isPending}
                      >
                        {hasRequestBeenSent ? (
                          <>
                            <CheckCircleIcon className="size-4 mr-2" />
                            Request Sent
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="size-4 mr-2" />
                            Send Friend Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
