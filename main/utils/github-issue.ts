import {shell} from 'electron';
import {isSafeExternalUrl} from '../common/external-url';

type IssueOptions = {
  repoUrl: string;
  title?: string;
  body?: string;
};

// Opens GitHub's "new issue" form with the fields filled in. Plugin repo URLs come
// from npm, so only web links may open.
export const openNewGitHubIssue = ({repoUrl, title, body}: IssueOptions) => {
  const url = new URL(`${repoUrl}/issues/new`);

  if (title) {
    url.searchParams.set('title', title);
  }

  if (body) {
    url.searchParams.set('body', body);
  }

  if (isSafeExternalUrl(url.href)) {
    shell.openExternal(url.href);
  }
};
