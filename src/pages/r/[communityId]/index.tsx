import { Community } from "@/pages/atoms/CommunitiesAtom";
import { firestore } from "@/pages/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { GetServerSidePropsContext } from "next";
import React from "react";
import safeJsonStringify from "safe-json-stringify";

type CommunityPageProps = {
  communityData: Community;
};

const CommunityPage = ({ communityData }: CommunityPageProps) => {
  console.log('here is data', communityData); // missing a lot of data like shown here (only have ID) https://youtu.be/rDAdcZ2KdNg?t=3663
  return <div> welcome to {communityData.id}</div>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // get community data and pass it to client

  try {
    const communityDocRef = doc(
      firestore,
      "communities",
      context.query.communityId as string
    );

    const communityDoc = await getDoc(communityDocRef);

    return {
      props: {
        communityData: JSON.parse(
          safeJsonStringify({ id: communityDoc.id, ...communityDoc.data() })
        ),
      },
    };
  } catch (error) {
    // could add error page here
    console.log("getServerSideProps error", error);
  }
}

export default CommunityPage;
