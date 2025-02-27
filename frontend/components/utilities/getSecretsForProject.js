import getSecrets from "../../pages/api/files/GetSecrets";
import guidGenerator from "./randomId";


const {
	decryptAssymmetric,
	decryptSymmetric,
} = require("../../components/utilities/crypto");
const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

const envMapping = {
	Development: "dev",
	Staging: "staging",
	Production: "prod",
	Testing: "test",
};

const getSecretsForProject = async ({
	env,
	setFileState,
	setIsKeyAvailable,
	setData,
	workspaceId
}) => {
	try {
		let file;
		try {
			file = await getSecrets(
				workspaceId,
				envMapping[env]
			);

			setFileState(file);
		} catch (error) {
			console.log("ERROR: Not able to access the latest file");
		}
		// This is called isKeyAvilable but what it really means is if a person is able to create new key pairs
		setIsKeyAvailable(
			!file.key ? (file.secrets.length == 0 ? true : false) : true
		);

		const PRIVATE_KEY = localStorage.getItem("PRIVATE_KEY");

		let tempFileState = [];
		if (file.key) {
			// assymmetrically decrypt symmetric key with local private key
			const key = decryptAssymmetric({
				ciphertext: file.key.encryptedKey,
				nonce: file.key.nonce,
				publicKey: file.key.sender.publicKey,
				privateKey: PRIVATE_KEY,
			});

			file.secrets.map((secretPair) => {
				// decrypt .env file with symmetric key
				const plainTextKey = decryptSymmetric({
					ciphertext: secretPair.secretKey.ciphertext,
					iv: secretPair.secretKey.iv,
					tag: secretPair.secretKey.tag,
					key,
				});

				const plainTextValue = decryptSymmetric({
					ciphertext: secretPair.secretValue.ciphertext,
					iv: secretPair.secretValue.iv,
					tag: secretPair.secretValue.tag,
					key,
				});
				tempFileState.push({
					key: plainTextKey,
					value: plainTextValue,
					type: secretPair.type,
				});
			});
		}
		setFileState(tempFileState);

		setData(
			tempFileState.map((line, index) => [
				guidGenerator(),
				index,
				line["key"],
				line["value"],
				line["type"],
			])
			// .sort((a, b) =>
			// 	sortMethod == "alphabetical"
			// 		? a[2].localeCompare(b[2])
			// 		: b[2].localeCompare(a[2])
			// )
		);
		return tempFileState.map((line, index) => [
			guidGenerator(),
			index,
			line["key"],
			line["value"],
			line["type"],
		]);
	} catch (error) {
		console.log("Something went wrong during accessing or decripting secrets.");
	}
	return true;
};

export default getSecretsForProject;
