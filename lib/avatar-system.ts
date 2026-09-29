import type { ImageSourcePropType } from "react-native";

export type AvatarGender = "m" | "f";
export type AvatarStyle = "90s" | "1920s" | "1950s" | "1970s" | "1980s" | "Y2K";

export type AvatarDefinition = { id: string; animal: string; gender: AvatarGender; style: AvatarStyle; source: ImageSourcePropType; thumbnail: ImageSourcePropType };

export const AVATAR_DEFINITIONS: AvatarDefinition[] = [
  { id: "bat-m-80s", animal: "bat", gender: "m", style: "1980s", source: require("@/assets/avatars/avatar-bat-m-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bat-m-80s.webp") },
  { id: "bat-m", animal: "bat", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-bat-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bat-m.webp") },
  { id: "bear-m-50s", animal: "bear", gender: "m", style: "1950s", source: require("@/assets/avatars/avatar-bear-m-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bear-m-50s.webp") },
  { id: "bear-m", animal: "bear", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-bear-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bear-m.webp") },
  { id: "bee-f-70s", animal: "bee", gender: "f", style: "1970s", source: require("@/assets/avatars/avatar-bee-f-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bee-f-70s.webp") },
  { id: "bee-f", animal: "bee", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-bee-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bee-f.webp") },
  { id: "bull-m-20s", animal: "bull", gender: "m", style: "1920s", source: require("@/assets/avatars/avatar-bull-m-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bull-m-20s.webp") },
  { id: "bull-m", animal: "bull", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-bull-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-bull-m.webp") },
  { id: "butterfly-f-20s", animal: "butterfly", gender: "f", style: "1920s", source: require("@/assets/avatars/avatar-butterfly-f-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-butterfly-f-20s.webp") },
  { id: "butterfly-f", animal: "butterfly", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-butterfly-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-butterfly-f.webp") },
  { id: "cat-f-20s", animal: "cat", gender: "f", style: "1920s", source: require("@/assets/avatars/avatar-cat-f-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-cat-f-20s.webp") },
  { id: "cat-f", animal: "cat", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-cat-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-cat-f.webp") },
  { id: "chameleon-m-y2k", animal: "chameleon", gender: "m", style: "Y2K", source: require("@/assets/avatars/avatar-chameleon-m-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-chameleon-m-y2k.webp") },
  { id: "chameleon-m", animal: "chameleon", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-chameleon-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-chameleon-m.webp") },
  { id: "crab-m-80s", animal: "crab", gender: "m", style: "1980s", source: require("@/assets/avatars/avatar-crab-m-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-crab-m-80s.webp") },
  { id: "crab-m", animal: "crab", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-crab-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-crab-m.webp") },
  { id: "crocodile-m-80s", animal: "crocodile", gender: "m", style: "1980s", source: require("@/assets/avatars/avatar-crocodile-m-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-crocodile-m-80s.webp") },
  { id: "crocodile-m", animal: "crocodile", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-crocodile-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-crocodile-m.webp") },
  { id: "deer-m-y2k", animal: "deer", gender: "m", style: "Y2K", source: require("@/assets/avatars/avatar-deer-m-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-deer-m-y2k.webp") },
  { id: "deer-m", animal: "deer", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-deer-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-deer-m.webp") },
  { id: "dog-m-50s", animal: "dog", gender: "m", style: "1950s", source: require("@/assets/avatars/avatar-dog-m-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dog-m-50s.webp") },
  { id: "dog-m", animal: "dog", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-dog-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dog-m.webp") },
  { id: "dolphin-f-50s", animal: "dolphin", gender: "f", style: "1950s", source: require("@/assets/avatars/avatar-dolphin-f-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dolphin-f-50s.webp") },
  { id: "dolphin-f", animal: "dolphin", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-dolphin-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dolphin-f.webp") },
  { id: "dragon-m-70s", animal: "dragon", gender: "m", style: "1970s", source: require("@/assets/avatars/avatar-dragon-m-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dragon-m-70s.webp") },
  { id: "dragon-m", animal: "dragon", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-dragon-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-dragon-m.webp") },
  { id: "eagle-m-20s", animal: "eagle", gender: "m", style: "1920s", source: require("@/assets/avatars/avatar-eagle-m-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-eagle-m-20s.webp") },
  { id: "eagle-m", animal: "eagle", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-eagle-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-eagle-m.webp") },
  { id: "elephant-m-80s", animal: "elephant", gender: "m", style: "1980s", source: require("@/assets/avatars/avatar-elephant-m-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-elephant-m-80s.webp") },
  { id: "elephant-m", animal: "elephant", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-elephant-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-elephant-m.webp") },
  { id: "flamingo-f-50s", animal: "flamingo", gender: "f", style: "1950s", source: require("@/assets/avatars/avatar-flamingo-f-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-flamingo-f-50s.webp") },
  { id: "flamingo-f", animal: "flamingo", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-flamingo-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-flamingo-f.webp") },
  { id: "fox-f-20s", animal: "fox", gender: "f", style: "1920s", source: require("@/assets/avatars/avatar-fox-f-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-fox-f-20s.webp") },
  { id: "fox-f", animal: "fox", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-fox-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-fox-f.webp") },
  { id: "frog-f-70s", animal: "frog", gender: "f", style: "1970s", source: require("@/assets/avatars/avatar-frog-f-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-frog-f-70s.webp") },
  { id: "frog-f", animal: "frog", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-frog-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-frog-f.webp") },
  { id: "giraffe-f-70s", animal: "giraffe", gender: "f", style: "1970s", source: require("@/assets/avatars/avatar-giraffe-f-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-giraffe-f-70s.webp") },
  { id: "giraffe-f", animal: "giraffe", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-giraffe-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-giraffe-f.webp") },
  { id: "goat-m-y2k", animal: "goat", gender: "m", style: "Y2K", source: require("@/assets/avatars/avatar-goat-m-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-goat-m-y2k.webp") },
  { id: "goat-m", animal: "goat", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-goat-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-goat-m.webp") },
  { id: "gorilla-m-50s", animal: "gorilla", gender: "m", style: "1950s", source: require("@/assets/avatars/avatar-gorilla-m-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-gorilla-m-50s.webp") },
  { id: "gorilla-m", animal: "gorilla", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-gorilla-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-gorilla-m.webp") },
  { id: "hamster-f-80s", animal: "hamster", gender: "f", style: "1980s", source: require("@/assets/avatars/avatar-hamster-f-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hamster-f-80s.webp") },
  { id: "hamster-f", animal: "hamster", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-hamster-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hamster-f.webp") },
  { id: "hedgehog-f-y2k", animal: "hedgehog", gender: "f", style: "Y2K", source: require("@/assets/avatars/avatar-hedgehog-f-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hedgehog-f-y2k.webp") },
  { id: "hedgehog-f", animal: "hedgehog", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-hedgehog-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hedgehog-f.webp") },
  { id: "hippo-m-70s", animal: "hippo", gender: "m", style: "1970s", source: require("@/assets/avatars/avatar-hippo-m-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hippo-m-70s.webp") },
  { id: "hippo-m", animal: "hippo", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-hippo-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-hippo-m.webp") },
  { id: "horse-m-50s", animal: "horse", gender: "m", style: "1950s", source: require("@/assets/avatars/avatar-horse-m-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-horse-m-50s.webp") },
  { id: "horse-m", animal: "horse", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-horse-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-horse-m.webp") },
  { id: "jellyfish-f-80s", animal: "jellyfish", gender: "f", style: "1980s", source: require("@/assets/avatars/avatar-jellyfish-f-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-jellyfish-f-80s.webp") },
  { id: "jellyfish-f", animal: "jellyfish", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-jellyfish-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-jellyfish-f.webp") },
  { id: "kangaroo-m-y2k", animal: "kangaroo", gender: "m", style: "Y2K", source: require("@/assets/avatars/avatar-kangaroo-m-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-kangaroo-m-y2k.webp") },
  { id: "kangaroo-m", animal: "kangaroo", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-kangaroo-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-kangaroo-m.webp") },
  { id: "koala-f-80s", animal: "koala", gender: "f", style: "1980s", source: require("@/assets/avatars/avatar-koala-f-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-koala-f-80s.webp") },
  { id: "koala-f", animal: "koala", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-koala-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-koala-f.webp") },
  { id: "lion-m-20s", animal: "lion", gender: "m", style: "1920s", source: require("@/assets/avatars/avatar-lion-m-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-lion-m-20s.webp") },
  { id: "lion-m", animal: "lion", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-lion-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-lion-m.webp") },
  { id: "llama-f-y2k", animal: "llama", gender: "f", style: "Y2K", source: require("@/assets/avatars/avatar-llama-f-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-llama-f-y2k.webp") },
  { id: "llama-f", animal: "llama", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-llama-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-llama-f.webp") },
  { id: "monkey-m-70s", animal: "monkey", gender: "m", style: "1970s", source: require("@/assets/avatars/avatar-monkey-m-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-monkey-m-70s.webp") },
  { id: "monkey-m", animal: "monkey", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-monkey-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-monkey-m.webp") },
  { id: "octopus-f-70s", animal: "octopus", gender: "f", style: "1970s", source: require("@/assets/avatars/avatar-octopus-f-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-octopus-f-70s.webp") },
  { id: "octopus-f", animal: "octopus", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-octopus-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-octopus-f.webp") },
  { id: "owl-m-80s", animal: "owl", gender: "m", style: "1980s", source: require("@/assets/avatars/avatar-owl-m-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-owl-m-80s.webp") },
  { id: "owl-m", animal: "owl", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-owl-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-owl-m.webp") },
  { id: "panda-f-50s", animal: "panda", gender: "f", style: "1950s", source: require("@/assets/avatars/avatar-panda-f-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-panda-f-50s.webp") },
  { id: "panda-f", animal: "panda", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-panda-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-panda-f.webp") },
  { id: "parrot-f-50s", animal: "parrot", gender: "f", style: "1950s", source: require("@/assets/avatars/avatar-parrot-f-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-parrot-f-50s.webp") },
  { id: "parrot-f", animal: "parrot", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-parrot-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-parrot-f.webp") },
  { id: "penguin-f-20s", animal: "penguin", gender: "f", style: "1920s", source: require("@/assets/avatars/avatar-penguin-f-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-penguin-f-20s.webp") },
  { id: "penguin-f", animal: "penguin", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-penguin-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-penguin-f.webp") },
  { id: "pig-f-80s", animal: "pig", gender: "f", style: "1980s", source: require("@/assets/avatars/avatar-pig-f-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-pig-f-80s.webp") },
  { id: "pig-f", animal: "pig", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-pig-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-pig-f.webp") },
  { id: "rabbit-f-20s", animal: "rabbit", gender: "f", style: "1920s", source: require("@/assets/avatars/avatar-rabbit-f-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-rabbit-f-20s.webp") },
  { id: "rabbit-f", animal: "rabbit", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-rabbit-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-rabbit-f.webp") },
  { id: "raccoon-f-y2k", animal: "raccoon", gender: "f", style: "Y2K", source: require("@/assets/avatars/avatar-raccoon-f-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-raccoon-f-y2k.webp") },
  { id: "raccoon-f", animal: "raccoon", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-raccoon-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-raccoon-f.webp") },
  { id: "rhino-m-70s", animal: "rhino", gender: "m", style: "1970s", source: require("@/assets/avatars/avatar-rhino-m-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-rhino-m-70s.webp") },
  { id: "rhino-m", animal: "rhino", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-rhino-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-rhino-m.webp") },
  { id: "seahorse-f-y2k", animal: "seahorse", gender: "f", style: "Y2K", source: require("@/assets/avatars/avatar-seahorse-f-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-seahorse-f-y2k.webp") },
  { id: "seahorse-f", animal: "seahorse", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-seahorse-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-seahorse-f.webp") },
  { id: "shark-m-20s", animal: "shark", gender: "m", style: "1920s", source: require("@/assets/avatars/avatar-shark-m-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-shark-m-20s.webp") },
  { id: "shark-m", animal: "shark", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-shark-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-shark-m.webp") },
  { id: "sloth-m-y2k", animal: "sloth", gender: "m", style: "Y2K", source: require("@/assets/avatars/avatar-sloth-m-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-sloth-m-y2k.webp") },
  { id: "sloth-m", animal: "sloth", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-sloth-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-sloth-m.webp") },
  { id: "snail-f-y2k", animal: "snail", gender: "f", style: "Y2K", source: require("@/assets/avatars/avatar-snail-f-y2k.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-snail-f-y2k.webp") },
  { id: "snail-f", animal: "snail", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-snail-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-snail-f.webp") },
  { id: "squirrel-f-50s", animal: "squirrel", gender: "f", style: "1950s", source: require("@/assets/avatars/avatar-squirrel-f-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-squirrel-f-50s.webp") },
  { id: "squirrel-f", animal: "squirrel", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-squirrel-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-squirrel-f.webp") },
  { id: "tiger-m-50s", animal: "tiger", gender: "m", style: "1950s", source: require("@/assets/avatars/avatar-tiger-m-50s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-tiger-m-50s.webp") },
  { id: "tiger-m", animal: "tiger", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-tiger-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-tiger-m.webp") },
  { id: "toucan-f-80s", animal: "toucan", gender: "f", style: "1980s", source: require("@/assets/avatars/avatar-toucan-f-80s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-toucan-f-80s.webp") },
  { id: "toucan-f", animal: "toucan", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-toucan-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-toucan-f.webp") },
  { id: "turtle-m-70s", animal: "turtle", gender: "m", style: "1970s", source: require("@/assets/avatars/avatar-turtle-m-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-turtle-m-70s.webp") },
  { id: "turtle-m", animal: "turtle", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-turtle-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-turtle-m.webp") },
  { id: "wolf-m-20s", animal: "wolf", gender: "m", style: "1920s", source: require("@/assets/avatars/avatar-wolf-m-20s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-wolf-m-20s.webp") },
  { id: "wolf-m", animal: "wolf", gender: "m", style: "90s", source: require("@/assets/avatars/avatar-wolf-m.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-wolf-m.webp") },
  { id: "zebra-f-70s", animal: "zebra", gender: "f", style: "1970s", source: require("@/assets/avatars/avatar-zebra-f-70s.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-zebra-f-70s.webp") },
  { id: "zebra-f", animal: "zebra", gender: "f", style: "90s", source: require("@/assets/avatars/avatar-zebra-f.webp") , thumbnail: require("@/assets/avatars/thumbs/avatar-zebra-f.webp") },
];

export const SHINY_AVATARS = {
  "bull-shiny": require("@/assets/avatars/shiny/avatar-bull-shiny.webp"),
  "dragon-shiny": require("@/assets/avatars/shiny/avatar-dragon-shiny.webp"),
  "kangaroo-shiny": require("@/assets/avatars/shiny/avatar-kangaroo-shiny.webp"),
  "lion-shiny": require("@/assets/avatars/shiny/avatar-lion-shiny.webp"),
  "owl-shiny": require("@/assets/avatars/shiny/avatar-owl-shiny.webp"),
  "parrot-shiny": require("@/assets/avatars/shiny/avatar-parrot-shiny.webp"),
  "prayercircle-shiny": require("@/assets/avatars/shiny/avatar-prayercircle-shiny.webp"),
  "tiger-shiny": require("@/assets/avatars/shiny/avatar-tiger-shiny.webp"),
} as const;

export const SHINY_AVATAR_THUMBNAILS = {
  "bull-shiny": require("@/assets/avatars/thumbs/avatar-bull-shiny.webp"),
  "dragon-shiny": require("@/assets/avatars/thumbs/avatar-dragon-shiny.webp"),
  "kangaroo-shiny": require("@/assets/avatars/thumbs/avatar-kangaroo-shiny.webp"),
  "lion-shiny": require("@/assets/avatars/thumbs/avatar-lion-shiny.webp"),
  "owl-shiny": require("@/assets/avatars/thumbs/avatar-owl-shiny.webp"),
  "parrot-shiny": require("@/assets/avatars/thumbs/avatar-parrot-shiny.webp"),
  "prayercircle-shiny": require("@/assets/avatars/thumbs/avatar-prayercircle-shiny.webp"),
  "tiger-shiny": require("@/assets/avatars/thumbs/avatar-tiger-shiny.webp"),
} as const;

export type ShinyAvatarId = keyof typeof SHINY_AVATARS;

export const SHINY_ACHIEVEMENTS = [
  { id: "first-task", name: "Dawn Lion", hint: "Schedule your first task", avatarId: "lion-shiny", title: "First Task" },
  { id: "full-set", name: "Triune Dragon", hint: "Schedule one task of each type", avatarId: "dragon-shiny", title: "Full Set" },
  { id: "curator", name: "Psalm Parrot", hint: "Save your first album", avatarId: "parrot-shiny", title: "Curator" },
  { id: "streak-50", name: "Burning Bush Tiger", hint: "Reach a 50-day prayer streak", avatarId: "tiger-shiny", title: "50-Day Streak" },
  { id: "streak-100", name: "Heavens Owl", hint: "Reach a 100-day prayer streak", avatarId: "owl-shiny", title: "100-Day Streak" },
  { id: "fast-40", name: "Wilderness Kangaroo", hint: "Complete a 40-day fast", avatarId: "kangaroo-shiny", title: "40-Day Fast" },
  { id: "fast-100", name: "Armor of God Bull", hint: "Complete a 100-day fast", avatarId: "bull-shiny", title: "100-Day Fast" },
  { id: "fast-365", name: "Mr. Prayer Circle", hint: "Complete a 365-day fast", avatarId: "prayercircle-shiny", title: "365-Day Fast" },
] as const;
export type AchievementId = (typeof SHINY_ACHIEVEMENTS)[number]["id"];

const STYLE_ORDER: AvatarStyle[] = ["90s", "1920s", "1950s", "1970s", "1980s", "Y2K"];
export { STYLE_ORDER };

export function avatarDefinitionById(id?: string) { return AVATAR_DEFINITIONS.find((avatar) => avatar.id === id); }

export function getAvatarDefinitionForPerson(id: string, gender?: AvatarGender, avatarAsset?: string) {
  const selected = avatarDefinitionById(avatarAsset);
  // Keep the original initials circle until the user explicitly chooses a
  // bundled avatar. The arguments remain in this API for caller compatibility.
  void id;
  void gender;
  return selected;
}

export function getAvatarAssetForPerson(id: string, gender?: AvatarGender, avatarAsset?: string) {
  return getAvatarDefinitionForPerson(id, gender, avatarAsset)?.id;
}
