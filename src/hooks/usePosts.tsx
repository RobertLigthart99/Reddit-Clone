import {
  collection,
  deleteDoc,
  doc,
  getDocs,

  query,
  where,
  writeBatch
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { communityState } from "../atoms/communitiesAtom";
import { Post, postState, PostVote } from "../atoms/postsAtom";
import { auth, firestore, storage } from "../firebase/clientApp";

const usePosts = () => {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const currentCommunity = useRecoilValue(communityState).currentCommunity;
  const setAuthModalState = useSetRecoilState(authModalState);

  const onVote = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
  ) => {
    event.stopPropagation();
    // check for a user -> if not open auth modal

    if (!user?.uid) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    try {
      const { voteStatus } = post;
      const existingVote = postStateValue.postVotes.find(
        (vote) => vote.postId === post.id
      );

      const batch = writeBatch(firestore);
      const updatedPost = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes = [...postStateValue.postVotes];
      let voteChange = vote;

      // New vote
      if (!existingVote) {
        // create a new postVote document
        const postVoteRef = doc(
          collection(firestore, "users", `${user?.uid}/postVotes`)
        );

        const newVote: PostVote = {
          id: postVoteRef.id,
          postId: post.id!,
          communityId,
          voteValue: vote,
        };

        batch.set(postVoteRef, newVote);

        // add subscract 1 to/from post.votestatus
        updatedPost.voteStatus = voteStatus + vote;
        updatedPostVotes = [...updatedPostVotes, newVote];
      }
      // existing vot e- they have voted on the post before
      else {
        const postVoteRef = doc(
          firestore,
          "users",
          `${user?.uid}/postVotes/${existingVote.id}`
        );

        // removing their vote ( up ) or down
        if (existingVote.voteValue === vote) {
          //creating a new postvoew document
          updatedPost.voteStatus = voteStatus - vote;
          updatedPostVotes = updatedPostVotes.filter(
            (vote) => vote.id !== existingVote.id
          );
          // deleting postvote document
          batch.delete(postVoteRef);

          voteChange *= -1;
        }
        // flipping their vote
        else {
          // add /subtract 2 to/from post.votestatus
          updatedPost.voteStatus = voteStatus + 2 * vote;

          const voteIdx = postStateValue.postVotes.findIndex(
            (vote) => vote.id === existingVote.id
          );

          updatedPostVotes[voteIdx] = {
            ...existingVote,
            voteValue: vote,
          };

          // updating the existing postvote document
          batch.update(postVoteRef, {
            voteValue: vote,
          });

          voteChange = 2 * vote;
        }
      }

      // update state with updates values
      const postRef = doc(firestore, "posts", post.id!);
      batch.update(postRef, { voteStatus: voteStatus + voteChange });

      await batch.commit();

      // update our post document
      const postIdx = postStateValue.posts.findIndex(
        (item) => item.id === post.id
      );

      updatedPosts[postIdx] = updatedPost;
      setPostStateValue((prev) => ({
        ...prev,
        posts: updatedPosts,
        postVotes: updatedPostVotes,
      }));

      if (postStateValue.selectedPost) {
        setPostStateValue((prev) => ({
          ...prev,
          selectedPost: updatedPost,
        }));
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  const onSelectPost = async (post: Post) => {
    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: post,
    }));
    router.push(`/r/${post.communityId}/comments/${post.id}`);
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      // check if image, delete if exists
      if (post.imageURL) {
        const imageRef = ref(storage, `posts/${post.id}/image`);
        await deleteObject(imageRef);
      }

      // delete post document from firestore
      const postDocRef = doc(firestore, "posts", post.id!);
      await deleteDoc(postDocRef);

      //update recoil state
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
      }));
      return true;
    } catch (error: any) {
      console.log("THERE WAS AN ERROR", error);
      return false;
    }
  };

  const getCommunityPostVotes = async (communintyId: string) => {
    const postVotesQuery = query(
      collection(firestore, "users", `${user?.uid}/postVotes`),
      where("communityId", "==", communintyId)
    );

    const postVoteDocs = await getDocs(postVotesQuery);
    const postVotes = postVoteDocs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPostStateValue((prev) => ({
      ...prev,
      postVotes: postVotes as PostVote[],
    }));
  };

  // after refesh, vote status stays
  useEffect(() => {
    if (!user || !currentCommunity?.id) return;
    getCommunityPostVotes(currentCommunity?.id);
  }, [user, currentCommunity]);

  useEffect(() => {
    if (!user) {
      // clear user post votes
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    }
  }, [user]);

  return {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};

export default usePosts;
