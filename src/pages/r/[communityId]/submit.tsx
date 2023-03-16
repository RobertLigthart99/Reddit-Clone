import { communityState } from "@/pages/atoms/communitiesAtom";
import PageContent from "@/pages/components/Layout/PageContent";
import NewPostForm from "@/pages/components/Posts/NewPostForm";
import { auth } from "@/pages/firebase/clientApp";
import { Box, Text } from "@chakra-ui/react";
import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue } from "recoil";

function SubmitPostPage({}) {
  const [user] = useAuthState(auth);
  const communityStateValue = useRecoilValue(communityState);
  console.log('COMMUNITY', communityStateValue)
  return (
    <PageContent>
      <>
        <Box p="14px 0px" borderBottom="1px solid" borderColor="white">
          <Text>Create a post</Text>
        </Box>
        {user && <NewPostForm user={user} />} 
      </>
      <>About</>
    </PageContent>
  );
}

export default SubmitPostPage;
