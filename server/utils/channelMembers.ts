import User from "../models/User";
import Channel from "../models/Channel";

export const DEFAULT_CHANNEL_MEMBER_EMAIL = "prerana.k@inspironlabs.com";

export const INITIAL_CHANNELS = [
  "HR Connect",
  "Culture Connect",
  "Finance Connect",
];

export const getPreranaUser = async () => {
  return User.findOne({
    email: { $regex: `^${DEFAULT_CHANNEL_MEMBER_EMAIL}$`, $options: "i" },
  });
};

export const mergeMembers = (existing: any[], extraIds: any[]) => {
  const memberIds = new Set(
    existing.map((member) => member.userId?.toString()).filter(Boolean),
  );
  const merged = [...existing];

  extraIds.forEach((id) => {
    const memberId = id?.toString();

    if (!memberId || memberIds.has(memberId)) return;

    merged.push({ userId: id });
    memberIds.add(memberId);
  });

  return merged;
};

export const addPreranaToInitialChannels = async () => {
  const prerana = await getPreranaUser();

  if (!prerana?._id) {
    console.error(
      `❌ Default member ${DEFAULT_CHANNEL_MEMBER_EMAIL} was not found`,
    );
    return;
  }

  const result = await Channel.updateMany(
    {
      name: { $in: INITIAL_CHANNELS },
      "members.userId": { $ne: prerana._id },
    },
    {
      $addToSet: { members: { userId: prerana._id } },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `✅ Added ${DEFAULT_CHANNEL_MEMBER_EMAIL} to ${result.modifiedCount} initial channel(s)`,
    );
  }
};
