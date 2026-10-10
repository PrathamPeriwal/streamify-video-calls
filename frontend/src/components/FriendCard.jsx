import { Link } from "react-router";
import { LANGUAGE_TO_FLAG } from "../constants";
import { MessageCircleIcon } from "lucide-react";
import { handleAvatarError } from "../lib/utils";

const FriendCard = ({ friend, unreadCount = 0 }) => {
  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow relative">
      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="badge badge-error badge-lg gap-1">
            <MessageCircleIcon className="size-3" />
            {unreadCount}
          </div>
        </div>
      )}
      
      <div className="card-body p-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar size-12 relative">
            <img src={friend.profilePic} alt={friend.fullName} loading="lazy" onError={handleAvatarError} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-error rounded-full border-2 border-base-200"></span>
            )}
          </div>
          <h3 className="font-semibold truncate">{friend.fullName}</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="badge badge-secondary text-xs">
            {getLanguageFlag(friend.nativeLanguage)}
            Native: {friend.nativeLanguage}
          </span>
          <span className="badge badge-outline text-xs">
            {getLanguageFlag(friend.learningLanguage)}
            Learning: {friend.learningLanguage}
          </span>
        </div>

        <Link 
          to={`/chat/${friend._id}`} 
          className={`btn w-full ${unreadCount > 0 ? 'btn-primary' : 'btn-outline'}`}
        >
          {unreadCount > 0 ? (
            <>
              <MessageCircleIcon className="size-4" />
              {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
            </>
          ) : (
            'Message'
          )}
        </Link>
      </div>
    </div>
  );
};
export default FriendCard;

export function getLanguageFlag(language) {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
      />
    );
  }
  return null;
}
