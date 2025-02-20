import React, { useEffect, useState, forwardRef, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactTimeAgo from 'react-time-ago';
import { Orbis, Discussion, User, useOrbis } from '@orbisclub/components';
import { shortAddress, getIpfsLink } from '../utils';
import { ExternalLinkIcon, EditIcon, LoadingCircle, BinIcon } from './Icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import Upvote from './Upvote';
import UrlMetadata from './UrlMetadata';
import ProofBadge from './ProofBadge';
import Modal from './Modal';

/** For Markdown support */
import { marked } from 'marked';
import parse from 'html-react-parser';
import useSinglePost from '../hooks/useSinglePost';

const ArticleContent = ({ postId, post: initialPost }, ref) => {
  const { orbis, user } = useOrbis();
  // const [hasLiked, setHasLiked] = useState(false);
  // const [updatedPost, setUpdatedPost] = useState(post);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // const [deletingPost, setDeletingPost] = useState(false);

  const deleteModalRef = useRef();

  // const router = useRouter();

  const singlePost = useSinglePost({
    postId,
  });
  const { deletePostMutation, reactionQuery, reactToPostMutation } = singlePost;
  const post = singlePost.post || initialPost;

  /** Check if user liked this post */
  // useEffect(() => {
  //   if (user) {
  //     getReaction();
  //   }

  //   async function getReaction() {
  //     let { data, error } = await orbis.getReaction(post.stream_id, user.did);
  //     if (data && data.type && data.type == 'like') {
  //       setHasLiked(true);
  //     }
  //   }
  // }, [user]);

  /** Will replace classic code <pre> support with a more advanced integration */
  const replacePreWithSyntaxHighlighter = (node) => {
    if (node.type === 'tag' && node.name === 'pre') {
      const codeNode = node.children.find((child) => child.name === 'code');
      const language = codeNode.attribs.class?.split('-')[1] || ''; // Assumes a format like "language-js"

      return (
        <SyntaxHighlighter language='javascript' style={theme}>
          {codeNode.children[0].data}
        </SyntaxHighlighter>
      );
    }
  };

  const markdownContent = post.content.body.replace(/\n/g, '  \n');
  const htmlContent = marked(markdownContent);
  const reactComponent = parse(htmlContent, {
    replace: replacePreWithSyntaxHighlighter,
  });

  /** Will like / upvote the post */
  // const like = () => {
  // if (user) {
  //   setHasLiked(true);
  //   setUpdatedPost({
  //     ...updatedPost,
  //     count_likes: post.count_likes + 1,
  //   });
  //   let res = await orbis.react(post.stream_id, 'like');
  //   console.log('res:', res);
  // } else {
  //   alert('You must be connected to react to posts.');
  // }
  // };

  const like = () => reactToPostMutation.mutate('like');
  const downvote = () => reactToPostMutation.mutate('downvote');

  // const deletePost = async () => {
  //   setDeletingPost(true);
  //   try {
  //     const res = await orbis.deletePost(post.stream_id);
  //     router.push('/');
  //   } catch (error) {
  //     console.error(error);
  //   }
  //   setDeletingPost(false);
  // };

  const openDeleteModal = () => setDeleteModalOpen(true);
  const closeDeleteModal = () => setDeleteModalOpen(false);

  const deletingPost = deletePostMutation.isPending;

  return (
    <>
      {deleteModalOpen && (
        <Modal ref={deleteModalRef} handleClose={() => closeDeleteModal()}>
          <h3 className='text-primary'>
            Are you sure you want to delete this post?
          </h3>
          <div className='flex justify-end mt-3'>
            <button
              className='btn-sm py-1.5 bg-red-500 text-primary'
              onClick={() => deletePostMutation.mutate()}
              disabled={deletingPost}
            >
              {deletingPost && <LoadingCircle />}
              Confirm delete
            </button>
          </div>
        </Modal>
      )}
      <article ref={ref} className='w-full overflow-x-hidden mb-8'>
        {/* Post header */}
        <header>
          <div className='flex flex-row items-top'>
            <h1 className='text-6xl text-primary mb-4 valverde'>
              {post.content.title}
            </h1>
            <Upvote
              loading={
                reactionQuery.isLoading ||
                reactToPostMutation.isPending ||
                singlePost.loading
              }
              like={like}
              downvote={downvote}
              reacting={reactToPostMutation.isPending}
              liked={reactionQuery.data === 'like'}
              downvoted={reactionQuery.data === 'downvote'}
              count={post.count_likes}
            />
          </div>

          {/** Article Metadata */}
          <div className='flex items-center justify-between mt-4 mb-4'>
            <div className='text-xs text-secondary flex flex-row items-center flex-wrap'>
              {/* Post date & creator details */}
              <span className='text-brand'>—</span>{' '}
              <ReactTimeAgo date={post.timestamp * 1000} locale='en-US' />{' '}
              <span className='text-secondary mr-2 ml-2'>·</span>
              <span className='text-primary'>
                <User hover={true} details={post.creator_details} />
              </span>
              <span className='text-secondary mr-2 ml-2'>·</span>
              {/** Proof link to Cerscan */}
              {post.stream_id && <ProofBadge stream_id={post.stream_id} />}
              {/** Edit button if user is creator of the post */}
              {user && user.did == post.creator && (
                <>
                  <span className='text-secondary mr-2 ml-2'>·</span>
                  <Link
                    href={'/edit/' + post.stream_id}
                    className='btn-sm py-1.5 btn-brand'
                  >
                    <EditIcon style={{ marginRight: 4 }} />
                    Edit
                  </Link>
                  <span className='text-secondary mr-2 ml-2'>·</span>
                  <button
                    className='btn-sm py-1.5 bg-red-500'
                    onClick={() => openDeleteModal()}
                  >
                    <BinIcon className='mr-1' />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/** Display main image if any */}
        {post.content.media && post.content.media.length > 0 && (
          <img
            className='w-full mb-4'
            src={getIpfsLink(post.content.media[0])}
            alt={post.content.title}
          />
        )}

        {/* Post content */}
        <div className='text-slate-500 space-y-8 article-content'>
          {reactComponent}
        </div>

        {/** Display URL metadata if any */}
        {post.indexing_metadata?.urlMetadata?.title && (
          <UrlMetadata metadata={post.indexing_metadata.urlMetadata} />
        )}

        <div className='flex items-center justify-center my-10'>
          <Upvote
            loading={
              reactionQuery.isLoading ||
              reactToPostMutation.isPending ||
              singlePost.loading
            }
            like={like}
            downvote={downvote}
            reacting={reactToPostMutation.isPending}
            liked={reactionQuery.data === 'like'}
            downvoted={reactionQuery.data === 'downvote'}
            count={post.count_likes}
          />
        </div>

        {/** Show commenting feed only if not new post  */}
        {post.stream_id && (
          <div className='mt-8 comments-section'>
            <Discussion
              context={post.content.context}
              master={post.stream_id}
            />
          </div>
        )}
      </article>
    </>
  );
};

export default forwardRef(ArticleContent);

export const theme = {
  'code[class*="language-"]': {
    background: 'transparent',
    color: '#111111',
    fontSize: '#12px',
    textShadow: '0 1px rgba(0, 0, 0, 0.3)',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    lineHeight: '1.5',
    MozTabSize: '2',
    OTabSize: '2',
    tabSize: '2',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    background: '#142438',
    color: '#111111',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    lineHeight: '1.5',
    fontSize: '#12px',
    MozTabSize: '2',
    OTabSize: '2',
    tabSize: '2',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
    padding: '15px',
    overflow: 'auto',
    borderRadius: '0.45em',
  },
  'code[class*="language-"]::-moz-selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  'code[class*="language-"] *::-moz-selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  'pre[class*="language-"] *::-moz-selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  'code[class*="language-"]::selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  'code[class*="language-"] *::selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  'pre[class*="language-"] *::selection': {
    background: 'hsl(220, 13%, 28%)',
    color: 'inherit',
    textShadow: 'none',
  },
  ':not(pre) > code[class*="language-"]': {
    padding: '0.2em 0.3em',
    borderRadius: '0.3em',
    whiteSpace: 'normal',
  },
  comment: {
    color: '#868B95',
    fontStyle: 'italic',
  },
  prolog: {
    color: 'hsl(220, 10%, 40%)',
  },
  cdata: {
    color: 'hsl(220, 10%, 40%)',
  },
  doctype: {
    color: 'hsl(220, 14%, 71%)',
  },
  punctuation: {
    color: 'hsl(220, 14%, 71%)',
  },
  entity: {
    color: 'hsl(220, 14%, 71%)',
    cursor: 'help',
  },
  'attr-name': {
    color: '#ffd171',
  },
  'class-name': {
    color: '#ffd171',
  },
  boolean: {
    color: '#ffd171',
  },
  constant: {
    color: '#ffd171',
  },
  number: {
    color: '#ff9944',
  },
  atrule: {
    color: '#ffd171',
  },
  keyword: {
    color: '#FF99F5',
  },
  property: {
    color: '#FF6DFD',
  },
  tag: {
    color: '#FF6DFD',
  },
  symbol: {
    color: '#FF6DFD',
  },
  deleted: {
    color: '#FF6DFD',
  },
  important: {
    color: '#FF6DFD',
  },
  selector: {
    color: '#c2ff95',
  },
  string: {
    color: '#5CF97C',
  },
  char: {
    color: '#5CF97C',
  },
  builtin: {
    color: '#c2ff95',
  },
  inserted: {
    color: '#c2ff95',
  },
  regex: {
    color: '#c2ff95',
  },
  'attr-value': {
    color: '#c2ff95',
  },
  'attr-value > .token.punctuation': {
    color: '#c2ff95',
  },
  variable: {
    color: 'hsl(207, 82%, 66%)',
  },
  operator: {
    color: '#58B8FF',
  },
  function: {
    color: '#58B8FF',
  },
  url: {
    color: 'hsl(187, 47%, 55%)',
  },
  'attr-value > .token.punctuation.attr-equals': {
    color: 'hsl(220, 14%, 71%)',
  },
  'special-attr > .token.attr-value > .token.value.css': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-css .token.selector': {
    color: '#FF6DFD',
  },
  '.language-css .token.property': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-css .token.function': {
    color: 'hsl(187, 47%, 55%)',
  },
  '.language-css .token.url > .token.function': {
    color: 'hsl(187, 47%, 55%)',
  },
  '.language-css .token.url > .token.string.url': {
    color: '#c2ff95',
  },
  '.language-css .token.important': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.language-css .token.atrule .token.rule': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.language-javascript .token.operator': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.language-javascript .token.template-string > .token.interpolation > .token.interpolation-punctuation.punctuation':
    {
      color: 'hsl(5, 48%, 51%)',
    },
  '.language-json .token.operator': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-json .token.null.keyword': {
    color: '#ffd171',
  },
  '.language-markdown .token.url': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-markdown .token.url > .token.operator': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-markdown .token.url-reference.url > .token.string': {
    color: 'hsl(220, 14%, 71%)',
  },
  '.language-markdown .token.url > .token.content': {
    color: 'hsl(207, 82%, 66%)',
  },
  '.language-markdown .token.url > .token.url': {
    color: 'hsl(187, 47%, 55%)',
  },
  '.language-markdown .token.url-reference.url': {
    color: 'hsl(187, 47%, 55%)',
  },
  '.language-markdown .token.blockquote.punctuation': {
    color: 'hsl(220, 10%, 40%)',
    fontStyle: 'italic',
  },
  '.language-markdown .token.hr.punctuation': {
    color: 'hsl(220, 10%, 40%)',
    fontStyle: 'italic',
  },
  '.language-markdown .token.code-snippet': {
    color: '#c2ff95',
  },
  '.language-markdown .token.bold .token.content': {
    color: '#ffd171',
  },
  '.language-markdown .token.italic .token.content': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.language-markdown .token.strike .token.content': {
    color: '#FF6DFD',
  },
  '.language-markdown .token.strike .token.punctuation': {
    color: '#FF6DFD',
  },
  '.language-markdown .token.list.punctuation': {
    color: '#FF6DFD',
  },
  '.language-markdown .token.title.important > .token.punctuation': {
    color: '#FF6DFD',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  namespace: {
    Opacity: '0.8',
  },
  'token.tab:not(:empty):before': {
    color: 'hsla(220, 14%, 71%, 0.15)',
    textShadow: 'none',
  },
  'token.cr:before': {
    color: 'hsla(220, 14%, 71%, 0.15)',
    textShadow: 'none',
  },
  'token.lf:before': {
    color: 'hsla(220, 14%, 71%, 0.15)',
    textShadow: 'none',
  },
  'token.space:before': {
    color: 'hsla(220, 14%, 71%, 0.15)',
    textShadow: 'none',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item': {
    marginRight: '0.4em',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > button': {
    background: 'hsl(220, 13%, 26%)',
    color: 'hsl(220, 9%, 55%)',
    padding: '0.1em 0.4em',
    borderRadius: '0.3em',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > a': {
    background: 'hsl(220, 13%, 26%)',
    color: 'hsl(220, 9%, 55%)',
    padding: '0.1em 0.4em',
    borderRadius: '0.3em',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > span': {
    background: 'hsl(220, 13%, 26%)',
    color: 'hsl(220, 9%, 55%)',
    padding: '0.1em 0.4em',
    borderRadius: '0.3em',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:hover': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:focus': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:hover': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:focus': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:hover': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  'div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:focus': {
    background: 'hsl(220, 13%, 28%)',
    color: 'hsl(220, 14%, 71%)',
  },
  '.line-highlight.line-highlight': {
    background: 'hsla(220, 100%, 80%, 0.04)',
  },
  '.line-highlight.line-highlight:before': {
    background: 'hsl(220, 13%, 26%)',
    color: 'hsl(220, 14%, 71%)',
    padding: '0.1em 0.6em',
    borderRadius: '0.3em',
    boxShadow: '0 2px 0 0 rgba(0, 0, 0, 0.2)',
  },
  '.line-highlight.line-highlight[data-end]:after': {
    background: 'hsl(220, 13%, 26%)',
    color: 'hsl(220, 14%, 71%)',
    padding: '0.1em 0.6em',
    borderRadius: '0.3em',
    boxShadow: '0 2px 0 0 rgba(0, 0, 0, 0.2)',
  },
  'pre[id].linkable-line-numbers.linkable-line-numbers span.line-numbers-rows > span:hover:before':
    {
      backgroundColor: 'hsla(220, 100%, 80%, 0.04)',
    },
  '.line-numbers.line-numbers .line-numbers-rows': {
    borderRightColor: 'hsla(220, 14%, 71%, 0.15)',
  },
  '.command-line .command-line-prompt': {
    borderRightColor: 'hsla(220, 14%, 71%, 0.15)',
  },
  '.line-numbers .line-numbers-rows > span:before': {
    color: 'hsl(220, 14%, 45%)',
  },
  '.command-line .command-line-prompt > span:before': {
    color: 'hsl(220, 14%, 45%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-1': {
    color: '#FF6DFD',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-5': {
    color: '#FF6DFD',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-9': {
    color: '#FF6DFD',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-2': {
    color: '#c2ff95',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-6': {
    color: '#c2ff95',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-10': {
    color: '#c2ff95',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-3': {
    color: 'hsl(207, 82%, 66%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-7': {
    color: 'hsl(207, 82%, 66%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-11': {
    color: 'hsl(207, 82%, 66%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-4': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-8': {
    color: 'hsl(286, 60%, 67%)',
  },
  '.rainbow-braces .token.token.punctuation.brace-level-12': {
    color: 'hsl(286, 60%, 67%)',
  },
  'pre.diff-highlight > code .token.token.deleted:not(.prefix)': {
    backgroundColor: 'hsla(353, 100%, 66%, 0.15)',
  },
  'pre > code.diff-highlight .token.token.deleted:not(.prefix)': {
    backgroundColor: 'hsla(353, 100%, 66%, 0.15)',
  },
  'pre.diff-highlight > code .token.token.deleted:not(.prefix)::-moz-selection':
    {
      backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
    },
  'pre.diff-highlight > code .token.token.deleted:not(.prefix) *::-moz-selection':
    {
      backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
    },
  'pre > code.diff-highlight .token.token.deleted:not(.prefix)::-moz-selection':
    {
      backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
    },
  'pre > code.diff-highlight .token.token.deleted:not(.prefix) *::-moz-selection':
    {
      backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
    },
  'pre.diff-highlight > code .token.token.deleted:not(.prefix)::selection': {
    backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
  },
  'pre.diff-highlight > code .token.token.deleted:not(.prefix) *::selection': {
    backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
  },
  'pre > code.diff-highlight .token.token.deleted:not(.prefix)::selection': {
    backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
  },
  'pre > code.diff-highlight .token.token.deleted:not(.prefix) *::selection': {
    backgroundColor: 'hsla(353, 95%, 66%, 0.25)',
  },
  'pre.diff-highlight > code .token.token.inserted:not(.prefix)': {
    backgroundColor: 'hsla(137, 100%, 55%, 0.15)',
  },
  'pre > code.diff-highlight .token.token.inserted:not(.prefix)': {
    backgroundColor: 'hsla(137, 100%, 55%, 0.15)',
  },
  'pre.diff-highlight > code .token.token.inserted:not(.prefix)::-moz-selection':
    {
      backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
    },
  'pre.diff-highlight > code .token.token.inserted:not(.prefix) *::-moz-selection':
    {
      backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
    },
  'pre > code.diff-highlight .token.token.inserted:not(.prefix)::-moz-selection':
    {
      backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
    },
  'pre > code.diff-highlight .token.token.inserted:not(.prefix) *::-moz-selection':
    {
      backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
    },
  'pre.diff-highlight > code .token.token.inserted:not(.prefix)::selection': {
    backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
  },
  'pre.diff-highlight > code .token.token.inserted:not(.prefix) *::selection': {
    backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
  },
  'pre > code.diff-highlight .token.token.inserted:not(.prefix)::selection': {
    backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
  },
  'pre > code.diff-highlight .token.token.inserted:not(.prefix) *::selection': {
    backgroundColor: 'hsla(135, 73%, 55%, 0.25)',
  },
  '.prism-previewer.prism-previewer:before': {
    borderColor: 'hsl(224, 13%, 17%)',
  },
  '.prism-previewer-gradient.prism-previewer-gradient div': {
    borderColor: 'hsl(224, 13%, 17%)',
    borderRadius: '0.3em',
  },
  '.prism-previewer-color.prism-previewer-color:before': {
    borderRadius: '0.3em',
  },
  '.prism-previewer-easing.prism-previewer-easing:before': {
    borderRadius: '0.3em',
  },
  '.prism-previewer.prism-previewer:after': {
    borderTopColor: 'hsl(224, 13%, 17%)',
  },
  '.prism-previewer-flipped.prism-previewer-flipped.after': {
    borderBottomColor: 'hsl(224, 13%, 17%)',
  },
  '.prism-previewer-angle.prism-previewer-angle:before': {
    background: 'hsl(219, 13%, 22%)',
  },
  '.prism-previewer-time.prism-previewer-time:before': {
    background: 'hsl(219, 13%, 22%)',
  },
  '.prism-previewer-easing.prism-previewer-easing': {
    background: 'hsl(219, 13%, 22%)',
  },
  '.prism-previewer-angle.prism-previewer-angle circle': {
    stroke: 'hsl(220, 14%, 71%)',
    strokeOpacity: '1',
  },
  '.prism-previewer-time.prism-previewer-time circle': {
    stroke: 'hsl(220, 14%, 71%)',
    strokeOpacity: '1',
  },
  '.prism-previewer-easing.prism-previewer-easing circle': {
    stroke: 'hsl(220, 14%, 71%)',
    fill: 'transparent',
  },
  '.prism-previewer-easing.prism-previewer-easing path': {
    stroke: 'hsl(220, 14%, 71%)',
  },
  '.prism-previewer-easing.prism-previewer-easing line': {
    stroke: 'hsl(220, 14%, 71%)',
  },
};
