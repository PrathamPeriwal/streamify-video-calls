import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../lib/api";
import { LANGUAGES } from "../constants";
import { XIcon, LoaderIcon, ShuffleIcon } from "lucide-react";
import toast from "react-hot-toast";
import { generateRandomAvatar, handleAvatarError } from "../lib/utils";

const EditProfileModal = ({ open, onClose, authUser }) => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    fullName: "",
    bio: "",
    nativeLanguage: "",
    learningLanguage: "",
    location: "",
    profilePic: "",
  });

  useEffect(() => {
    if (!authUser) return;
    setFormState({
      fullName: authUser.fullName || "",
      bio: authUser.bio || "",
      nativeLanguage: authUser.nativeLanguage || "",
      learningLanguage: authUser.learningLanguage || "",
      location: authUser.location || "",
      profilePic: authUser.profilePic || "",
    });
  }, [authUser]);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveProfile(formState);
  };

  const handleRandomAvatar = () => {
    const randomAvatar = generateRandomAvatar();
    setFormState((prev) => ({ ...prev, profilePic: randomAvatar }));
    toast.success("Random avatar set");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-base-100 w-full max-w-2xl rounded-xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="avatar">
              <div className="w-20 h-20 rounded-full">
                {formState.profilePic ? (
                  <img src={formState.profilePic} alt="Profile" onError={handleAvatarError} />
                ) : (
                  <div className="bg-base-300 w-full h-full" />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="input input-bordered flex items-center gap-2">
                <span className="text-sm">Photo URL</span>
                <input
                  className="grow"
                  type="url"
                  value={formState.profilePic}
                  onChange={(e) => setFormState({ ...formState, profilePic: e.target.value })}
                  placeholder="https://..."
                />
              </label>
              <button
                type="button"
                className="btn btn-outline btn-sm w-fit"
                onClick={handleRandomAvatar}
              >
                <ShuffleIcon className="size-4" />
                Random avatar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="form-control">
              <span className="label-text">Full Name</span>
              <input
                className="input input-bordered"
                value={formState.fullName}
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                required
              />
            </label>

            <label className="form-control">
              <span className="label-text">Location</span>
              <input
                className="input input-bordered"
                value={formState.location}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                placeholder="City, Country"
              />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text">Bio</span>
            <textarea
              className="textarea textarea-bordered"
              rows={3}
              value={formState.bio}
              onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="form-control">
              <span className="label-text">Native Language</span>
              <select
                className="select select-bordered"
                value={formState.nativeLanguage}
                onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
              >
                <option value="">Select</option>
                {LANGUAGES.map((lang) => (
                  <option key={`native-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text">Learning Language</span>
              <select
                className="select select-bordered"
                value={formState.learningLanguage}
                onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
                required
              >
                <option value="">Select</option>
                {LANGUAGES.map((lang) => (
                  <option key={`learn-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? <LoaderIcon className="animate-spin size-4" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
